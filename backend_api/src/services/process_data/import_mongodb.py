import pandas as pd
import requests
import os
import re
from urllib.parse import urlparse
import xlsxwriter
import logging
from bson import ObjectId
from pymongo import MongoClient
import json
import unicodedata

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

API_BASE_URL = "http://localhost:5000/api"
BACKEND_UPLOAD_DIR = os.path.join("./downloaded_images")
if not os.path.exists(BACKEND_UPLOAD_DIR):
    try:
        os.makedirs(BACKEND_UPLOAD_DIR)
    except OSError as e:
        logging.error(f"Không thể tạo thư mục {BACKEND_UPLOAD_DIR}: {e}")
        raise

VALID_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png']

def is_valid_objectid(oid):
    """Kiểm tra xem chuỗi có phải là ObjectId hợp lệ không."""
    try:
        ObjectId(oid)
        return True
    except Exception:
        return False

def fetch_brands():
    """Lấy danh sách thương hiệu từ API."""
    try:
        response = requests.get(f"{API_BASE_URL}/brand")
        response.raise_for_status()
        brands_data = response.json().get("brands", [])
        return {brand["br_name"]: ObjectId(brand["_id"]) for brand in brands_data if is_valid_objectid(brand["_id"])}
    except requests.RequestException as e:
        logging.error(f"Lỗi khi lấy danh sách thương hiệu: {e}")
        return {}

def fetch_categories():
    """Lấy danh sách danh mục và danh mục con từ API."""
    try:
        response = requests.get(f"{API_BASE_URL}/category/parents")
        response.raise_for_status()
        categories_data = response.json().get("data", [])
        
        parent_category_map = {cat["cate_name"]: ObjectId(cat["_id"]) for cat in categories_data if is_valid_objectid(cat["_id"])}
        sub_category_map = {}
        
        for cat in categories_data:
            cat_id = cat["_id"]
            sub_response = requests.get(f"{API_BASE_URL}/category/by-parent/{cat_id}")
            sub_response.raise_for_status()
            sub_categories = sub_response.json().get("data", [])
            sub_category_map.update({
                sub["cate_name"]: ObjectId(sub["_id"]) for sub in sub_categories if is_valid_objectid(sub["_id"])
            })
        
        return parent_category_map, sub_category_map
    except requests.RequestException as e:
        logging.error(f"Lỗi khi lấy danh sách danh mục: {e}")
        return {}, {}

def clean_filename(filename):
    """Làm sạch tên file, thay thế các ký tự không hợp lệ và loại bỏ dấu tiếng Việt."""
    cleaned = unicodedata.normalize('NFKD', filename).encode('ASCII', 'ignore').decode('ASCII')
    cleaned = re.sub(r'[<>:"/\\|?*@]', '_', cleaned)
    cleaned = re.sub(r'\s+', '_', cleaned.strip())
    return cleaned[:200] 

def parse_specifications(spec_str):
    """Chuyển đổi chuỗi specifications thành mảng các object."""
    if pd.isna(spec_str) or not spec_str.strip():
        return []
    try:
        specs = json.loads(spec_str)
        if not isinstance(specs, list):
            logging.warning(f"Specifications không phải mảng: {spec_str}")
            return []
        return specs[:5] 
    except json.JSONDecodeError:
        logging.warning(f"Lỗi khi parse specifications: {spec_str}")
        return []

def download_image(url, product_id, image_index):
    """Tải ảnh từ URL và lưu với định dạng {cleaned_product_id}_{image_index}_{cleaned_image_name}."""
    try:
        if not url or not url.startswith(('http://', 'https://')):
            logging.warning(f"URL không hợp lệ: {url}")
            return None
        
        response = requests.get(url, stream=True, timeout=10)
        response.raise_for_status()
        
        parsed_url = urlparse(url)
        original_name = os.path.basename(parsed_url.path).split("?")[0]
        
        file_extension = os.path.splitext(original_name)[1].lower()
        if file_extension not in VALID_IMAGE_EXTENSIONS:
            logging.warning(f"Phần mở rộng {file_extension} không hợp lệ, chuyển thành .jpg")
            file_extension = '.jpg'
        
        cleaned_product_id = clean_filename(str(product_id))
        cleaned_name = clean_filename(os.path.splitext(original_name)[0])
        new_image_name = f"{cleaned_product_id}_{image_index}_{cleaned_name}{file_extension}"
        image_path = os.path.join(BACKEND_UPLOAD_DIR, new_image_name)
        
        with open(image_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        logging.info(f"Đã tải và lưu ảnh: {image_path}")
        return f"/uploads/product/{new_image_name}"
    except requests.RequestException as e:
        logging.warning(f"Lỗi khi tải ảnh {url}: {e}")
        return None

def process_excel(input_file, output_file):
    try:
        df = pd.read_excel(input_file)
        
        required_columns = ["Product_id", "Product", "Quantity", "Price", "Parent_category", "Brand"]
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            raise ValueError(f"File Excel thiếu các cột: {', '.join(missing_columns)}")
        
        brand_map = fetch_brands()
        parent_category_map, sub_category_map = fetch_categories()
        
        grouped_data = {}
        for _, row in df.iterrows():
            product_id = str(row["Product_id"])
            if product_id not in grouped_data:
                grouped_data[product_id] = {
                    "p_name": row["Product"],
                    "p_images": [],
                    "p_stock_quantity": row["Quantity"],
                    "p_price": row["Price"],
                    "p_description": row.get("Description", ""),
                    "p_category": row["Parent_category"],
                    "p_subcategory": row.get("Category", ""),
                    "p_brand": row["Brand"],
                    "p_specifications": parse_specifications(row.get("Specifications", "")),
                    "has_valid_image": False
                }
            
            if pd.notna(row.get("Image_url")) and len(grouped_data[product_id]["p_images"]) < 5:
                image_path = download_image(row["Image_url"], product_id, f"image_{len(grouped_data[product_id]['p_images']) + 1}")
                if image_path:
                    grouped_data[product_id]["p_images"].append(image_path)
                    grouped_data[product_id]["has_valid_image"] = True
        
        output_data = []
        for product_id, product in grouped_data.items():
            brand = brand_map.get(product["p_brand"], "")
            category = parent_category_map.get(product["p_category"], "")
            subcategory = sub_category_map.get(product["p_subcategory"], "") if product["p_subcategory"] else ""
            
            if not brand:
                logging.warning(f"Thương hiệu '{product['p_brand']}' không tồn tại, bỏ qua sản phẩm {product['p_name']}")
                continue
            if not category:
                logging.warning(f"Danh mục '{product['p_category']}' không tồn tại, bỏ qua sản phẩm {product['p_name']}")
                continue
            if not product["has_valid_image"]:
                logging.warning(f"Sản phẩm {product['p_name']} không có ảnh hợp lệ, bỏ qua")
                continue
            
            output_data.append({
                "p_name": product["p_name"],
                "p_images": "|".join(product["p_images"]),
                "p_stock_quantity": product["p_stock_quantity"],
                "p_price": product["p_price"],
                "p_description": product["p_description"],
                "p_category": str(category),
                "p_subcategory": str(subcategory) if subcategory else "",
                "p_brand": str(brand),
                "p_specifications": product["p_specifications"]
            })
        
        output_df = pd.DataFrame(output_data)
        with pd.ExcelWriter(output_file, engine="xlsxwriter") as writer:
            output_df.to_excel(writer, index=False, sheet_name="Products")
            workbook = writer.book
            worksheet = writer.sheets["Products"]
            for col_num, col_name in enumerate(output_df.columns):
                max_len = max(
                    output_df[col_name].astype(str).map(len).max(),
                    len(col_name)
                )
                worksheet.set_column(col_num, col_num, max_len)
        
        logging.info(f"File Excel mới đã được tạo tại: {output_file}")
        return output_data
    
    except Exception as e:
        logging.error(f"Lỗi khi xử lý file Excel: {e}")
        raise

def import_to_mongodb(output_file, mongo_uri="mongodb://localhost:27017", db_name="ecommerce", collection_name="products"):
    """Import dữ liệu từ file Excel vào MongoDB với các trường ID được chuyển thành ObjectId."""
    try:
        client = MongoClient(mongo_uri)
        db = client[db_name]
        collection = db[collection_name]
        
        if db_name not in client.list_database_names():
            logging.info(f"Database '{db_name}' chưa tồn tại, sẽ được tạo tự động khi chèn dữ liệu")
        
        df = pd.read_excel(output_file)
        
        for _, row in df.iterrows():
            try:
                product_data = {
                    "_id": ObjectId(), 
                    "p_name": row["p_name"],
                    "p_images": row["p_images"].split("|") if pd.notna(row["p_images"]) else [],
                    "p_stock_quantity": row["p_stock_quantity"],
                    "p_price": row["p_price"],
                    "p_description": row["p_description"],
                    "p_category": ObjectId(row["p_category"]) if is_valid_objectid(row["p_category"]) else None,
                    "p_subcategory": ObjectId(row["p_subcategory"]) if pd.notna(row["p_subcategory"]) and is_valid_objectid(row["p_subcategory"]) else None,
                    "p_brand": ObjectId(row["p_brand"]) if is_valid_objectid(row["p_brand"]) else None,
                    "p_specifications": row["p_specifications"] if pd.notna(row["p_specifications"]) else []
                }
                
                if product_data["p_category"] is None:
                    logging.warning(f"Sản phẩm {row['p_name']} có p_category không hợp lệ, bỏ qua")
                    continue
                if product_data["p_brand"] is None:
                    logging.warning(f"Sản phẩm {row['p_name']} có p_brand không hợp lệ, bỏ qua")
                    continue
                
                existing_product = collection.find_one({
                    "p_name": product_data["p_name"],
                    "p_category": product_data["p_category"],
                    "p_brand": product_data["p_brand"]
                })
                
                if existing_product:
                    logging.info(f"Sản phẩm {row['p_name']} đã tồn tại, bỏ qua")
                    continue
                
                collection.insert_one(product_data)
                logging.info(f"Đã import sản phẩm {row['p_name']} vào MongoDB")
            
            except Exception as e:
                logging.error(f"Lỗi khi import sản phẩm {row['p_name']}: {e}")
                continue
        
        client.close()
        logging.info("Hoàn tất import dữ liệu vào MongoDB")
    
    except Exception as e:
        logging.error(f"Lỗi khi import dữ liệu vào MongoDB: {e}")
        raise

if __name__ == "__main__":
    input_file = "./list_products.xlsx"
    output_file = "processed_products.xlsx"
    
    process_excel(input_file, output_file)
    
    import_to_mongodb(
        output_file,
        mongo_uri="mongodb://localhost:27017",
        db_name="ecommerce",
        collection_name="products"
    )