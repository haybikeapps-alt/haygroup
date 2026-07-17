<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../accounting/journal.php';

class POS {
    private $pdo;
    private $accounting;

    public function __construct($pdo, $accounting) {
        $this->pdo = $pdo;
        $this->accounting = $accounting;
    }

    // Proses Checkout & Auto Jurnal
    public function checkout($branch_id, $items, $method) {
        $total = 0;
        $total_cost = 0;
        
        // Hitung total & cek stok
        foreach ($items as $item) {
            $total += $item['price'] * $item['qty'];
            $total_cost += $item['cost'] * $item['qty'];
        }

        $this->pdo->beginTransaction();
        try {
            // 1. Simpan Transaksi
            $inv = 'INV-' . date('Ymd') . rand(1000, 9999);
            $stmtTx = $this->pdo->prepare("INSERT INTO transactions (invoice, branch_id, total, method) VALUES (?, ?, ?, ?)");
            $stmtTx->execute([$inv, $branch_id, $total, $method]);
            $tx_id = $this->pdo->lastInsertId();

            // Simpan Item
            $stmtItem = $this->pdo->prepare("INSERT INTO transaction_items (transaction_id, product_id, qty, price, cost) VALUES (?, ?, ?, ?, ?)");
            foreach ($items as $item) {
                $stmtItem->execute([$tx_id, $item['id'], $item['qty'], $item['price'], $item['cost']]);
            }

            // 2. AUTO JURNAL AKUNTANSI (Standar IAI)
            $date = date('Y-m-d');
            
            // Jurnal 1: Penerimaan Kas dari Penjualan
            $kas_code = '1110';
            $pendapatan_code = $branch_id == 1 ? '4110' : ($branch_id == 2 ? '4120' : '4130');
            
            $entries_penjualan = [
                ['code' => $kas_code, 'debit' => $total, 'credit' => 0],
                ['code' => $pendapatan_code, 'debit' => 0, 'credit' => $total]
            ];
            $this->accounting->postJournal($date, "Penjualan $inv", $entries_penjualan, $tx_id);

            // Jurnal 2: Harga Pokok Penjualan (HPP)
            if ($total_cost > 0) {
                $entries_hpp = [
                    ['code' => '5110', 'debit' => $total_cost, 'credit' => 0], // HPP (Debit)
                    ['code' => '1140', 'debit' => 0, 'credit' => $total_cost]  // Persediaan (Kredit)
                ];
                $this->accounting->postJournal($date, "HPP $inv", $entries_hpp, $tx_id);
            }

            $this->pdo->commit();
            return ['success' => true, 'invoice' => $inv];
        } catch (Exception $e) {
            $this->pdo->rollBack();
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
}

 $pos = new POS($pdo, $accounting);

// Handle POST Request Checkout (Kasir menekan tombol Bayar)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] == 'checkout') {
    // Di dunia nyata, items diambil dari $_SESSION['cart']
    $branch_id = $_POST['branch_id'];
    $method = $_POST['method'];
    
    // Contoh dummy item (Anda integrasikan dengan Session Cart nanti)
    $items = [
        ['id' => 1, 'qty' => 2, 'price' => 20000, 'cost' => 8000]
    ];

    $result = $pos->checkout($branch_id, $items, $method);
    if ($result['success']) {
        echo "Sukses! Invoice: " . $result['invoice'];
    } else {
        echo "Gagal: " . $result['error'];
    }
}
?>
