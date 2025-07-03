import pandas as pd
from mlxtend.frequent_patterns import fpgrowth
from mlxtend.preprocessing import TransactionEncoder
from mlxtend.frequent_patterns import association_rules
from collections import Counter
import json
from itertools import product

# Danh sách 69 sản phẩm
subcategory_keys = [
    "dieu_hoa", "tivi", "tu_lanh", "may_giat", "may_loc_khong_khi", "may_say_quan_ao", 
    "tu_mat", "may_hut_am", "may_lam_da_vien", "may_rua_chen", "may_nuoc_nong_lanh", 
    "tu_cham_soc_quan_ao_thong_minh", "tu_ruou", "loa", "quat", "may_xay_da_nang", 
    "may_hut_bui", "noi_com_dien", "may_loc_nuoc", "may_pha_ca_phe", "lo_vi_song", 
    "bep", "lo_nuong", "cac_loai_noi", "noi_chien_khong_dau", "noi_lau", "may_lam_kem", 
    "may_xay_ca_phe", "binh_giu_nhiet", "do_ve_sinh", "may_lam_sua_chua", "dung_cu_pha_che", 
    "may_xay_bot", "ca_phe", "may_massage", "can", "may_do_huyet_ap", "may_phun_suong", 
    "may_xong_hoi", "may_do_do_am", "may_do_duong_huyet", "may_tro_thinh", "may_tam_nuoc", 
    "dai_nep_chan_tay", "dai_lung", "nhiet_ke", "khau_trang", "may_tao_nuoc_khu_khuan", 
    "sofa", "ban", "ghe", "goi_trang_tri", "ke_tivi", "tranh_treo_tuong", "dong_ho", 
    "gia_treo_tuong", "den", "cay_kieng", "may_in", "may_chieu", "may_huy_tai_lieu", 
    "may_tinh_bo_tui", "may_cham_cong", "ket_sat", "may_photocopy", "may_dong_sach", 
    "ban_lam_viec", "ghe_van_phong", "tu_van_phong"
]

# Ánh xạ tên sản phẩm từ dataset.csv sang subcategory_keys
name_mapping = {
    "Tivi": "tivi",
    "May giat": "may_giat",
    "May pha ca phe": "may_pha_ca_phe",
    "May loc nuoc": "may_loc_nuoc",
    "Loa": "loa",
    "Tu lanh": "tu_lanh",
    "Quat": "quat",
    "May in": "may_in",
    "Sofa": "sofa",
    "Den": "den",
    "May loc khong khi": "may_loc_khong_khi",
    "May xay da nang": "may_xay_da_nang",
    "May do huyet ap": "may_do_huyet_ap",
    "Ke tivi": "ke_tivi",
    "May Massage": "may_massage",
    "Do ve sinh": "do_ve_sinh",
    "Dieu hoa": "dieu_hoa",
    "May say quan ao": "may_say_quan_ao",
    "Tu mat": "tu_mat",
    "May hut am": "may_hut_am",
    "May lam da vien": "may_lam_da_vien",
    "May rua chen": "may_rua_chen",
    "May nuoc nong lanh": "may_nuoc_nong_lanh",
    "Tu cham soc quan ao thong minh": "tu_cham_soc_quan_ao_thong_minh",
    "Tu ruou": "tu_ruou",
    "May hut bui": "may_hut_bui",
    "Noi com dien": "noi_com_dien",
    "Lo vi song": "lo_vi_song",
    "Bep": "bep",
    "Lo nuong": "lo_nuong",
    "Cac loai noi": "cac_loai_noi",
    "Noi chien khong dau": "noi_chien_khong_dau",
    "Noi lau": "noi_lau",
    "May lam kem": "may_lam_kem",
    "May xay ca phe": "may_xay_ca_phe",
    "Binh giu nhiet": "binh_giu_nhiet",
    "May lam sua chua": "may_lam_sua_chua",
    "Dung cu pha che": "dung_cu_pha_che",
    "May xay bot": "may_xay_bot",
    "Ca phe": "ca_phe",
    "Can": "can",
    "May phun suong": "may_phun_suong",
    "May xong hoi": "may_xong_hoi",
    "May do do am": "may_do_do_am",
    "May do duong huyet": "may_do_duong_huyet",
    "May tro thinh": "may_tro_thinh",
    "May tam nuoc": "may_tam_nuoc",
    "Dai nep chan tay": "dai_nep_chan_tay",
    "Dai lung": "dai_lung",
    "Nhiet ke": "nhiet_ke",
    "Khau trang": "khau_trang",
    "May tao nuoc khu khuan": "may_tao_nuoc_khu_khuan",
    "Ban": "ban",
    "Ghe": "ghe",
    "Goi trang tri": "goi_trang_tri",
    "Tranh treo tuong": "tranh_treo_tuong",
    "Dong ho": "dong_ho",
    "Gia treo tuong": "gia_treo_tuong",
    "Cay kieng": "cay_kieng",
    "May chieu": "may_chieu",
    "May huy tai lieu": "may_huy_tai_lieu",
    "May tinh bo tui": "may_tinh_bo_tui",
    "May cham cong": "may_cham_cong",
    "Ket sat": "ket_sat",
    "May photocopy": "may_photocopy",
    "May dong sach": "may_dong_sach",
    "Ban lam viec": "ban_lam_viec",
    "Ghe van phong": "ghe_van_phong",
    "Tu van phong": "tu_van_phong"
}

df = pd.read_csv('dataset.csv')
df = df.replace(name_mapping)

transactions = df.iloc[:, 1:].apply(lambda row: [item for item in row if pd.notna(item)], axis=1).tolist()
print(f"\nSố lượng giao dịch: {len(transactions)}")
print("Sample transactions (first 5):")
print(transactions[:5])

# Tính tần suất sản phẩm
all_items = [item for transaction in transactions for item in transaction]
item_counts = Counter(all_items)
print(f"\nSố lượng sản phẩm duy nhất trong dữ liệu: {len(item_counts)}")
print("Top 5 sản phẩm phổ biến nhất:")
for item, count in item_counts.most_common(5):
    print(f"{item}: {count} giao dịch (support: {count/len(transactions):.6f})")

# Kiểm tra sản phẩm bị thiếu trong dữ liệu
missing_in_data = [item for item in subcategory_keys if item not in item_counts]
print("Sản phẩm không có trong dataset.csv:", missing_in_data)
print("Số sản phẩm bị thiếu trong dữ liệu:", len(missing_in_data))

# Tạo luật đơn cho tất cả 69 sản phẩm
single_rules = []
for item in subcategory_keys:
    count = item_counts.get(item, 0)
    support = count / len(transactions) if count > 0 else 0.0001
    single_rules.append({
        'antecedents': [item],
        'consequents': [item],
        'support': support,
        'confidence': 1.0,
        'lift': 1.0
    })

# Chuyển đổi dữ liệu thành one-hot encoding
te = TransactionEncoder()
te_ary = te.fit(transactions).transform(transactions)
df_encoded = pd.DataFrame(te_ary, columns=te.columns_)

# Danh sách các giá trị min_support và min_threshold
min_support_values = [0.0001, 0.0002, 0.0003, 0.0005, 0.001, 0.002, 0.003, 0.004, 0.005]
min_threshold_values = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]

all_rules = single_rules.copy()
seen_rules = set()

# Tạo luật kết hợp bằng FP-Growth
for min_support, min_threshold in product(min_support_values, min_threshold_values):
    print(f"\nChạy FP-Growth với min_support={min_support}, min_threshold={min_threshold}")
    
    frequent_itemsets = fpgrowth(df_encoded, min_support=min_support, use_colnames=True, max_len=4)
    
    if frequent_itemsets.empty:
        print(f"Không tìm thấy tập hợp thường xuyên với min_support={min_support}.")
        continue
    else:
        print(f"Số tập hợp thường xuyên: {len(frequent_itemsets)}")
        multi_itemsets = frequent_itemsets[frequent_itemsets['itemsets'].apply(lambda x: len(x) > 1)]
        print(f"Tập hợp thường xuyên có nhiều hơn 1 sản phẩm: {len(multi_itemsets)}")

    rules = association_rules(frequent_itemsets, metric="confidence", min_threshold=min_threshold)
    rules = rules[rules['lift'] > 1.0]
    
    if rules.empty:
        print(f"Không tìm thấy luật kết hợp với min_threshold={min_threshold}.")
        continue
    else:
        print(f"Số luật kết hợp: {len(rules)}")
    
    for _, rule in rules.iterrows():
        antecedents = tuple(sorted(rule['antecedents']))
        consequents = tuple(sorted(rule['consequents']))
        rule_key = (antecedents, consequents)
        if rule_key not in seen_rules:
            seen_rules.add(rule_key)
            all_rules.append({
                'antecedents': list(antecedents),
                'consequents': list(consequents),
                'support': rule['support'],
                'confidence': rule['confidence'],
                'lift': rule['lift']
            })

# Loại bỏ các luật đơn trùng lặp từ FP-Growth (nếu có)
all_rules = [rule for rule in all_rules if rule['antecedents'] != rule['consequents']] + single_rules

# Kiểm tra độ bao phủ sản phẩm
covered_products = set()
for rule in all_rules:
    covered_products.update(rule['antecedents'])
    covered_products.update(rule['consequents'])
missing_products = [item for item in subcategory_keys if item not in covered_products]
print("\nSản phẩm bị thiếu trong các luật:", missing_products)
print("Số sản phẩm bị thiếu:", len(missing_products))

# Lưu các luật vào file
with open('rules.json', 'w', encoding='utf-8') as f:
    json.dump(all_rules, f, ensure_ascii=False, indent=2)
print(f"\nĐã lưu {len(all_rules)} luật vào rules.json")
print(f"Số luật đơn: {len(single_rules)}")
print(f"Số luật kết hợp: {len(all_rules) - len(single_rules)}")