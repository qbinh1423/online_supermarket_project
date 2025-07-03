from flask import Flask, request, jsonify
import os
import numpy as np
import re
import pickle
import time
from pymongo import MongoClient
from PIL import Image
import tensorflow as tf
from tensorflow.keras.applications.efficientnet import EfficientNetB4
from sklearn.neighbors import NearestNeighbors
import cv2
import requests
import uuid
from io import BytesIO
from bson.objectid import ObjectId
from bson import json_util

app = Flask(__name__)

# Khởi tạo mô hình
def init_feature_extractor():
    try:
        print("Khởi tạo mô hình EfficientNetB4...")
        model = EfficientNetB4(weights='imagenet', include_top=False, pooling='avg')
        print("Mô hình đã được khởi tạo thành công")
        return model
    except Exception as e:
        print(f"Lỗi khi khởi tạo mô hình: {str(e)}")
        raise

# Tiền xử lý ảnh
def preprocess_image(img_data, target_size=(380, 380)):
    try:
        print(f"Nhận dữ liệu ảnh: {type(img_data)} - {len(img_data) if isinstance(img_data, (bytes, str)) else 'N/A'} bytes")
        if isinstance(img_data, str):
            if img_data.startswith('http'):
                print(f"Tải ảnh từ URL: {img_data}")
                response = requests.get(img_data, timeout=10)
                response.raise_for_status()
                img = Image.open(BytesIO(response.content)).convert('RGB')
            else:
                print(f"Mở ảnh từ đường dẫn: {img_data}")
                img = Image.open(img_data).convert('RGB')
        else:
            print("Xử lý ảnh upload")
            img = Image.open(BytesIO(img_data)).convert('RGB') if img_data else None

        if not img or img.size[0] <= 0 or img.size[1] <= 0:
            print("Ảnh không hợp lệ hoặc kích thước không đúng")
            return None

        img = img.resize(target_size, Image.Resampling.LANCZOS)
        img_array = np.array(img, dtype=np.uint8)

        if img_array.size == 0:
            print("Mảng ảnh rỗng sau khi chuyển đổi")
            return None

        img_array = cv2.cvtColor(img_array, cv2.COLOR_RGB2YCrCb)
        img_array[:,:,0] = cv2.equalizeHist(img_array[:,:,0])
        img_array = cv2.cvtColor(img_array, cv2.COLOR_YCrCb2RGB)

        kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]])
        img_array = cv2.filter2D(img_array, -1, kernel)

        img_array = tf.keras.preprocessing.image.img_to_array(img_array)
        img_array = np.expand_dims(img_array, axis=0)
        img_array = tf.keras.applications.efficientnet.preprocess_input(img_array)

        print(f"Xử lý ảnh thành công, kích thước: {img_array.shape}")
        return img_array
    except Exception as e:
        print(f"Lỗi tiền xử lý ảnh: {str(e)}")
        return None

def extract_features(model, img_array):
    try:
        features = model.predict(img_array)
        return features.flatten()
    except Exception as e:
        print(f"Lỗi trích xuất đặc trưng: {str(e)}")
        return None

def normalize_image_path(img_path):
    """Chuẩn hóa đường dẫn ảnh để khớp với p_images trong MongoDB."""
    try:
        if img_path.startswith('http'):
            from urllib.parse import urlparse
            parsed = urlparse(img_path)
            result = os.path.basename(parsed.path)
            print(f"Normalized URL path: {result}")
            return f"/uploads/product/{result}"
        
        base_dir = r"E:\ThucTapThucTe\Model\image-based\Ảnh sản phẩm"
        if img_path.startswith(base_dir):
            result = img_path[len(base_dir):].lstrip(os.sep).replace('\\', '/')
            print(f"Normalized local path: {result}")
            return f"/uploads/product/{result}"
        
        result = os.path.basename(img_path).replace('\\', '/')
        print(f"Normalized path: {result}")
        return f"/uploads/product/{result}"
    except Exception as e:
        print(f"Lỗi khi chuẩn hóa đường dẫn: {str(e)}")
        return img_path

def normalize_product_name(image_name):
    """Chuẩn hóa tên sản phẩm từ tên tệp ảnh."""
    return re.sub(r'\s+\d+\.(png|jpg|jpeg|webp)$', '', image_name, flags=re.IGNORECASE)

def get_mongo_client():
    try:
        client = MongoClient("mongodb://localhost:27017/")
        client.admin.command('ping')
        print("Kết nối MongoDB thành công")
        return client
    except Exception as e:
        print(f"Lỗi kết nối MongoDB: {str(e)}")
        raise

def build_feature_database(model, image_folder):
    features_list = []
    paths_list = []
    product_info = {}
    try:
        client = get_mongo_client()
        db = client["ecommerce"]
        products_collection = db["products"]
        
        image_count = 0
        for root, _, files in os.walk(image_folder):
            current_label = os.path.basename(root)
            for file in files:
                if file.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
                    image_count += 1
                    img_path = os.path.join(root, file)
                    print(f"Xử lý ảnh: {img_path}")
                    img_array = preprocess_image(img_path)
                    if img_array is None:
                        print(f"Bỏ qua ảnh: {img_path}")
                        continue
                    
                    features = extract_features(model, img_array)
                    if features is None:
                        print(f"Bỏ qua ảnh do lỗi trích xuất đặc trưng: {img_path}")
                        continue
                    
                    features_list.append(features)
                    paths_list.append(img_path)
                    
                    normalized_path = normalize_image_path(img_path)
                    product_name = normalize_product_name(normalized_path)
                    print(f"normalized_path: {normalized_path}, product_name: {product_name}")
                    
                    product = products_collection.find_one({
                        "p_images": {"$regex": re.escape(os.path.basename(normalized_path)), "$options": "i"}
                    })
                    if not product:
                        print(f"Không tìm thấy sản phẩm cho ảnh: {img_path}")
                        product = products_collection.find_one({
                            "p_name": {"$regex": re.escape(product_name), "$options": "i"}
                        })
                    
                    if not product:
                        print(f"Vẫn không tìm thấy sản phẩm cho ảnh: {img_path}")
                        continue
                    
                    product_id = str(product['_id'])
                    print(f"Tìm thấy sản phẩm với ID: {product_id}")
                    
                    if product_id not in product_info:
                        product_info[product_id] = {
                            'product_id': product_id,
                            'name': product['p_name'],
                            'images': product.get('p_images', []),
                            'price': product.get('p_price', 0),
                            'stock_quantity': product.get('p_stock_quantity', 0),
                            'description': product.get('p_description', ''),
                            'specifications': product.get('p_specifications', []),
                            'category': str(product.get('p_category', None)),
                            'subcategory': str(product.get('p_subcategory', None)),
                            'brand': str(product.get('p_brand', None)),
                            'label': current_label,
                            'image_paths': [],
                            'features_list': []
                        }
                        print(f"Khởi tạo product_id: {product_id}")
                    
                    product_info[product_id]['image_paths'].append(img_path)
                    product_info[product_id]['features_list'].append(features.tolist())
                    print(f"Thêm ảnh {normalized_path} vào product_id: {product_id}")
        
        print(f"Tìm thấy {image_count} ảnh trong thư mục")
        if not features_list:
            print("Không có ảnh nào được xử lý thành công")
            return None, None, None
        
        features_matrix = np.array(features_list)
        print(f"Kích thước features_matrix: {features_matrix.shape}")
        nbrs = NearestNeighbors(n_neighbors=min(20, len(features_list)), algorithm='brute', metric='cosine').fit(features_matrix)
        return nbrs, paths_list, product_info
    
    except Exception as e:
        print(f"Lỗi trong build_feature_database: {str(e)}")
        raise

def find_similar_images(model, nbrs, paths_list, product_info, query_img_data, top_k=5):
    if nbrs is None or paths_list is None or product_info is None:
        print("Mô hình hoặc dữ liệu chưa được khởi tạo")
        return []
    
    print(f"Số lượng ảnh trong paths_list: {len(paths_list)}")
    
    query_img_array = preprocess_image(query_img_data)
    if query_img_array is None:
        print("Lỗi xử lý ảnh truy vấn")
        return []
    
    query_features = extract_features(model, query_img_array)
    if query_features is None:
        print("Lỗi trích xuất đặc trưng ảnh truy vấn")
        return []
    
    print(f"Kích thước query_features: {query_features.shape}")
    distances, indices = nbrs.kneighbors([query_features])
    print(f"Distances: {distances[0][:top_k]}, Indices: {indices[0][:top_k]}")
    
    client = get_mongo_client()
    db = client["ecommerce"]
    products_collection = db["products"]
    
    seen_product_ids = set()
    similar_products = {}
    
    query_label = None
    if indices[0].size > 0:
        top_img_path = paths_list[indices[0][0]]
        for pid, info in product_info.items():
            if 'image_paths' in info and top_img_path in info['image_paths']:
                query_label = info.get('label', '')
                print(f"Nhãn dự đoán của ảnh truy vấn: {query_label}")
                break
    
    matching_label_count = 0
    
    for i, idx in enumerate(indices[0][:top_k]):
        img_path = paths_list[idx]
        similarity = 1 - distances[0][i]
        
        product_id = None
        for pid, info in product_info.items():
            if 'image_paths' in info and img_path in info['image_paths']:
                product_id = pid
                break
        
        if not product_id or product_id in seen_product_ids:
            print(f"Bỏ qua ảnh: {img_path} (product_id: {product_id})")
            continue
        
        product = None
        if ObjectId.is_valid(product_id):
            try:
                product = products_collection.find_one({"_id": ObjectId(product_id)})
                print(f"Tìm sản phẩm với product_id: {product_id}, kết quả: {product is not None}")
            except Exception as e:
                print(f"Lỗi khi lấy sản phẩm với product_id {product_id}: {str(e)}")
        
        if not product:
            normalized_path = normalize_image_path(img_path)
            product_name = normalize_product_name(normalized_path)
            print(f"Thử tìm sản phẩm với normalized_path: {normalized_path}, product_name: {product_name}")
            try:
                escaped_normalized_path = re.escape(os.path.basename(normalized_path))
                escaped_product_name = re.escape(product_name)
                product = products_collection.find_one({
                    "$or": [
                        {"p_images": {"$regex": escaped_normalized_path, "$options": "i"}},
                        {"p_name": {"$regex": escaped_product_name, "$options": "i"}}
                    ]
                })
                if product:
                    product_id = str(product['_id'])
                    print(f"Tìm thấy sản phẩm với ID: {product_id}")
            except Exception as e:
                print(f"Lỗi khi tìm sản phẩm với regex: {str(e)}")
        
        if not product:
            print(f"Không tìm thấy sản phẩm cho ảnh: {img_path}")
            continue
        
        seen_product_ids.add(product_id)
        specs = []
        specifications = product.get('p_specifications', [])
        if isinstance(specifications, list):
            for spec in specifications:
                if isinstance(spec, dict):
                    new_spec = {k: str(v) if isinstance(v, ObjectId) else v 
                                for k, v in spec.items()}
                    specs.append(new_spec)
                else:
                    print(f"Bỏ qua specification không hợp lệ: {spec}")
        else:
            print(f"p_specifications không phải danh sách: {specifications}")
        
        result_label = product_info.get(product_id, {}).get('label', '')
        if query_label and result_label == query_label:
            matching_label_count += 1
        
        similar_products[product_id] = {
            "id": str(product['_id']),
            "name": product.get('p_name', ''),
            "images": product.get('p_images', []),
            "price": product.get('p_price', 0),
            "stockQuantity": product.get('p_stock_quantity', 0),
            "description": product.get('p_description', ''),
            "specifications": specs,
            "category": str(product.get('p_category', None)),
            "subcategory": str(product.get('p_subcategory', None)),
            "brand": str(product.get('p_brand', None)),
            "similarity": float(similarity),
            "label": result_label
        }
        
        print(f"Kết quả {i+1}:")
        print(f"  - Tên sản phẩm: {product.get('p_name', '')}")
        print(f"  - ID: {product_id}")
        print(f"  - Tỉ lệ giống nhau: {(similarity * 100):.2f}%")
    
    sorted_products = sorted(similar_products.values(), key=lambda x: x['similarity'], reverse=True)[:top_k]
    
    accuracy = (matching_label_count / len(sorted_products)) * 100 if sorted_products else 0.0
    print("\n=== Tóm tắt kết quả tìm kiếm ===")
    print(f"Tổng số sản phẩm tìm thấy: {len(sorted_products)}")
    print(f"Số sản phẩm có nhãn khớp: {matching_label_count}")
    print(f"Độ chính xác (dựa trên nhãn): {accuracy:.2f}%")
    
    return sorted_products

def save_trained_data(nbrs, paths_list, product_info, save_dir="saved_data"):
    try:
        if nbrs is None or paths_list is None or product_info is None:
            print("Không có dữ liệu để lưu")
            return
        
        os.makedirs(save_dir, exist_ok=True)
        
        with open(os.path.join(save_dir, "nbrs.pkl"), 'wb') as f:
            pickle.dump(nbrs, f)
        
        with open(os.path.join(save_dir, "paths_list.pkl"), 'wb') as f:
            pickle.dump(paths_list, f)
        
        with open(os.path.join(save_dir, "product_info.pkl"), 'wb') as f:
            pickle.dump(product_info, f)
        
        with open(os.path.join(save_dir, "last_update.txt"), 'w') as f:
            f.write(str(time.time()))
        
        print("Đã lưu dữ liệu train vào thư mục saved_data")
    except Exception as e:
        print(f"Lỗi khi lưu dữ liệu train: {str(e)}")

def load_trained_data(save_dir="saved_data"):
    try:
        with open(os.path.join(save_dir, "nbrs.pkl"), 'rb') as f:
            nbrs = pickle.load(f)
        
        with open(os.path.join(save_dir, "paths_list.pkl"), 'rb') as f:
            paths_list = pickle.load(f)
        
        with open(os.path.join(save_dir, "product_info.pkl"), 'rb') as f:
            product_info = pickle.load(f)
        
        print("Đã load dữ liệu train từ thư mục saved_data")
        return nbrs, paths_list, product_info
    
    except FileNotFoundError:
        print("Không tìm thấy dữ liệu đã lưu, cần train lại")
        return None, None, None
    except Exception as e:
        print(f"Lỗi khi load dữ liệu train: {str(e)}")
        return None, None, None

def check_data_changed(image_folder, saved_time_file="saved_data/last_update.txt"):
    try:
        with open(saved_time_file, 'r') as f:
            last_saved_time = float(f.read())
    except:
        return True
    
    try:
        for root, _, files in os.walk(image_folder):
            for file in files:
                if file.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
                    file_path = os.path.join(root, file)
                    if os.path.getmtime(file_path) > last_saved_time:
                        return True
        return False
    except Exception as e:
        print(f"Lỗi khi kiểm tra thay đổi dữ liệu: {str(e)}")
        return True

model = init_feature_extractor()
nbrs, paths_list, product_info = None, None, None

def initialize_model():
    global nbrs, paths_list, product_info
    image_folder = r"E:\ThucTapThucTe\Project\backend_api\src\services\image-based\Ảnh sản phẩm"
    saved_dir = r"E:\ThucTapThucTe\Project\backend_api\src\services\image-based\saved_data"
    
    try:
        if check_data_changed(image_folder):
            print("Dữ liệu ảnh đã thay đổi, xây dựng lại...")
            nbrs, paths_list, product_info = build_feature_database(model, image_folder)
            save_trained_data(nbrs, paths_list, product_info, saved_dir)
        else:
            nbrs, paths_list, product_info = load_trained_data(saved_dir)
            if not nbrs or not paths_list or not product_info:
                print("Không tìm thấy dữ liệu train, xây dựng mới...")
                nbrs, paths_list, product_info = build_feature_database(model, image_folder)
                save_trained_data(nbrs, paths_list, product_info, saved_dir)
            else:
                print(f"Đã load {len(paths_list)} ảnh từ dữ liệu train")
    except Exception as e:
        print(f"Lỗi trong initialize_model: {str(e)}")
        raise

@app.route('/find_similar', methods=['POST'])
def find_similar():
    try:
        print("Nhận yêu cầu từ Express:", request.content_type)
        if request.content_type.startswith('multipart/form-data'):
            if 'image' not in request.files:
                return jsonify({'error': 'No image provided'}), 400
            img_data = request.files['image'].read()
            top_k = request.form.get('topK', 5, type=int)
        elif request.content_type == 'application/json':
            data = request.get_json()
            image_url = data.get('imageUrl')
            top_k = data.get('topK', 5)
            img_data = image_url if image_url else None
        else:
            return jsonify({'error': 'Unsupported content type'}), 415

        if not img_data:
            return jsonify({'error': 'No image data provided'}), 400

        print(f"Xử lý ảnh với top_k={top_k}")
        start_time = time.time()
        similar_images = find_similar_images(model, nbrs, paths_list, product_info, img_data, top_k)
        end_time = time.time()
        print(f"Hoàn thành tìm kiếm trong {end_time - start_time:.2f} giây")

        return jsonify({"data": similar_images}), 200
    except Exception as e:
        print(f"Lỗi endpoint /find_similar: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    try:
        initialize_model()
        app.run(host='0.0.0.0', port=5001, debug=True)
    except Exception as e:
        print(f"Lỗi khi khởi động server Flask: {str(e)}")