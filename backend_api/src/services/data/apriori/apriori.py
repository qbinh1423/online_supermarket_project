import pandas as pd
from mlxtend.frequent_patterns import apriori, association_rules
from mlxtend.preprocessing import TransactionEncoder
from tabulate import tabulate

# Đọc và tiền xử lý dữ liệu
df = pd.read_csv("../dataset.csv")

# Kiểm tra dữ liệu
print(f"Số lượng giao dịch: {len(df)}")

# Bỏ cột Transaction ID
df = df.drop(columns=["Transaction ID"])

# Gộp các sản phẩm theo từng giao dịch thành 1 danh sách
transactions = df.values.tolist()
transactions = [[item for item in transaction if pd.notnull(item)] for transaction in transactions]

# Dùng TransactionEncoder để chuyển đổi dữ liệu về dạng one-hot
te = TransactionEncoder()
te_ary = te.fit(transactions).transform(transactions)
df_encoded = pd.DataFrame(te_ary, columns=te.columns_)

# Áp dụng thuật toán Apriori với min_support thấp hơn để tìm thêm luật
frequent_itemsets = apriori(df_encoded, min_support=0.001, use_colnames=True)  # Giảm min_support
frequent_itemsets['length'] = frequent_itemsets['itemsets'].apply(lambda x: len(x))

# Lọc các tập hợp có độ dài <= 3
frequent_itemsets = frequent_itemsets[frequent_itemsets['length'] <= 3]

# Hiển thị thống kê độ dài tập hợp
print("\nThống kê độ dài:")
print(frequent_itemsets.groupby('length').size())

# Hiển thị toàn bộ Frequent Itemsets
print("\nFrequent Itemsets:")
pd.set_option('display.max_rows', 200)
pd.set_option('display.max_colwidth', 200)
print(frequent_itemsets)
pd.reset_option('display.max_rows')
pd.reset_option('display.max_colwidth')

# Tạo luật kết hợp với ngưỡng confidence cao hơn
rules = association_rules(frequent_itemsets, metric="confidence", min_threshold=0.8)

# Lọc các luật có lift > 5.0
rules = rules[rules['lift'] > 5.0]

# Kiểm tra xem có luật nào được tạo ra không
if not rules.empty:
    print("\nAssociation Rules (sắp xếp theo lift):")
    df_rules = rules.sort_values(by='lift', ascending=False)
    print(tabulate(df_rules[['antecedents', 'consequents', 'support', 'confidence', 'lift']].values,
                   headers=df_rules[['antecedents', 'consequents', 'support', 'confidence', 'lift']].columns,
                   tablefmt='fancy_grid'))

    # Trung bình độ tin cậy
    avg_confidence = df_rules['confidence'].mean()
    print(f"Trung bình độ tin cậy (Confidence): {avg_confidence:.2f}")

    # Trung bình lift
    avg_lift = df_rules['lift'].mean()
    print(f"Trung bình Lift: {avg_lift:.2f}")

    # Tính số lượng luật có độ tin cậy cao (> 60%)
    high_conf_rules = df_rules[df_rules['confidence'] > 0.6]
    print(f"Số luật có độ tin cậy > 60%: {len(high_conf_rules)} / {len(df_rules)}")
else:
    print("\nKhông có luật kết hợp nào được tạo ra. Vui lòng giảm ngưỡng min_support hoặc kiểm tra dữ liệu.")
