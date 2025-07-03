import pandas as pd
from itertools import combinations
from collections import defaultdict
import statistics

def load_data(file_path):
    try:
        df = pd.read_csv(file_path, sep=',', dtype=str, keep_default_na=False)
        transactions = []
        for _, row in df.iterrows():
            products = [item.strip() for item in row[1:] if item.strip()]
            if products:
                transactions.append(products)
        return transactions
    except Exception as e:
        print(f"Lỗi khi đọc file: {e}")
        return []

# Chuyển dữ liệu sang định dạng dọc
def to_vertical_format(transactions):
    vertical = defaultdict(set)
    for tid, transaction in enumerate(transactions, 1):
        for item in transaction:
            vertical[item].add(tid)
    return vertical

# Tính support của một tập hợp mục
def calculate_support(itemset, vertical, total_transactions):
    if not itemset:
        return 1.0
    tids = vertical[itemset[0]].copy()
    for item in itemset[1:]:
        tids &= vertical[item]
    return len(tids) / total_transactions

# Thuật toán ECLAT
def eclat(vertical, min_support, total_transactions):
    frequent_itemsets = []
    single_items = {frozenset([item]): vertical[item] for item in vertical}
    frequent_singles = {
        itemset: tids for itemset, tids in single_items.items()
        if len(tids) / total_transactions >= min_support
    }
    for itemset, tids in frequent_singles.items():
        support = len(tids) / total_transactions
        frequent_itemsets.append((itemset, support))
    
    k = 2
    current_frequent = frequent_singles
    while current_frequent:
        candidates = {}
        items = list(current_frequent.keys())
        for i in range(len(items)):
            for j in range(i + 1, len(items)):
                union_set = items[i] | items[j]
                if len(union_set) == k:
                    tids = current_frequent[items[i]] & current_frequent[items[j]]
                    if len(tids) / total_transactions >= min_support:
                        candidates[union_set] = tids
        for itemset, tids in candidates.items():
            support = len(tids) / total_transactions
            frequent_itemsets.append((itemset, support))
        current_frequent = candidates
        k += 1
    
    return frequent_itemsets

# Tính độ bao phủ của frequent itemsets
def calculate_coverage(frequent_itemsets, transactions, total_transactions):
    covered_tids = set()
    for itemset, _ in frequent_itemsets:
        tids = set()
        for item in itemset:
            if not tids:
                tids = vertical[item].copy()
            else:
                tids &= vertical[item]
        covered_tids.update(tids)
    coverage = len(covered_tids) / total_transactions
    return coverage

# Tạo luật kết hợp và tính confidence, lift
def generate_association_rules(frequent_itemsets, min_confidence=0.5):
    rules = []
    support_dict = {itemset: support for itemset, support in frequent_itemsets}
    
    for itemset, support in frequent_itemsets:
        if len(itemset) < 2:
            continue
        items = list(itemset)
        for r in range(1, len(items)):
            for antecedent in combinations(items, r):
                antecedent = frozenset(antecedent)
                consequent = itemset - antecedent
                if antecedent in support_dict and consequent in support_dict:
                    confidence = support / support_dict[antecedent]
                    if confidence >= min_confidence:
                        lift = confidence / support_dict[consequent]
                        rules.append({
                            'antecedent': set(antecedent),
                            'consequent': set(consequent),
                            'support': support,
                            'confidence': confidence,
                            'lift': lift
                        })
    
    return rules

# Chạy thuật toán
def main(file_path, min_support=0.003, min_confidence=0.6):
    global vertical
    transactions = load_data(file_path)
    if not transactions:
        print("Không có giao dịch nào được đọc từ file.")
        return None
    total_transactions = len(transactions)
    
    vertical = to_vertical_format(transactions)
    frequent_itemsets = eclat(vertical, min_support, total_transactions)
    frequent_itemsets.sort(key=lambda x: x[1], reverse=True)
    
    # In frequent itemsets
    print(f"\nNumber of frequent itemsets: {len(frequent_itemsets)}")
    print("Top 10 Frequent Itemsets:")
    for itemset, support in frequent_itemsets[:10]:
        print(f"Itemset: {set(itemset)}, Support: {support*100:.2f}%")
    
    # Thống kê chất lượng frequent itemsets
    supports = [support for _, support in frequent_itemsets]
    print("\nFrequent Itemsets Statistics:")
    print(f"Max Support: {max(supports)*100:.2f}%")
    print(f"Min Support: {min(supports)*100:.2f}%")
    print(f"Average Support: {statistics.mean(supports)*100:.2f}%")
    
    # Tính độ bao phủ
    coverage = calculate_coverage(frequent_itemsets, transactions, total_transactions)
    print(f"Coverage: {coverage*100:.2f}% (tỷ lệ giao dịch được bao phủ bởi frequent itemsets)")
    
    # Tạo và in tất cả association rules
    rules = generate_association_rules(frequent_itemsets, min_confidence)
    print(f"\nNumber of association rules (confidence ≥ {min_confidence*100}%): {len(rules)}")
    if rules:
        print("Association Rules:")
        for rule in rules:
            print(f"Rule: {rule['antecedent']} → {rule['consequent']}, "
                  f"Support: {rule['support']*100:.2f}%, Confidence: {rule['confidence']*100:.2f}%, Lift: {rule['lift']:.2f}")
    
    # Thống kê chất lượng association rules
    if rules:
        confidences = [rule['confidence'] for rule in rules]
        lifts = [rule['lift'] for rule in rules]
        print("\nAssociation Rules Statistics:")
        print(f"Average Confidence: {statistics.mean(confidences)*100:.2f}%")
        print(f"Average Lift: {statistics.mean(lifts):.2f}")
    
    return frequent_itemsets, rules

if __name__ == "__main__":
    file_path = "../dataset.csv"
    min_support = 0.004
    min_confidence = 0.8
    frequent_itemsets, rules = main(file_path, min_support, min_confidence)