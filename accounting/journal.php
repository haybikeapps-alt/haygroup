<?php
require_once __DIR__ . '/../../config/database.php';

class Accounting {
    private $pdo;

    public function __construct($pdo) {
        $this->pdo = $pdo;
    }

    // Fungsi Core: Posting Jurnal Double Entry
    public function postJournal($date, $desc, $entries, $transaction_id = null) {
        $total_debit = 0;
        $total_credit = 0;
        foreach ($entries as $e) {
            $total_debit += $e['debit'];
            $total_credit += $e['credit'];
        }

        // Validasi Standar IAI: Debit harus sama dengan Kredit
        if ($total_debit !== $total_credit) {
            throw new Exception("Jurnal tidak seimbang! Debit: $total_debit, Kredit: $total_credit");
        }

        $this->pdo->beginTransaction();
        try {
            // Insert Header Jurnal
            $stmt = $this->pdo->prepare("INSERT INTO journals (date, description, transaction_id) VALUES (?, ?, ?)");
            $stmt->execute([$date, $desc, $transaction_id]);
            $journal_id = $this->pdo->lastInsertId();

            // Insert Detail Jurnal
            $stmtEntry = $this->pdo->prepare("INSERT INTO journal_entries (journal_id, account_code, debit, credit) VALUES (?, ?, ?, ?)");
            foreach ($entries as $e) {
                $stmtEntry->execute([$journal_id, $e['code'], $e['debit'], $e['credit']]);
            }

            $this->pdo->commit();
            return true;
        } catch (Exception $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }

    // Menghitung Saldo Akun untuk Buku Besar / Laporan
    public function getAccountBalance($account_code) {
        $stmt = $this->pdo->prepare("
            SELECT 
                a.is_debit,
                COALESCE(SUM(je.debit), 0) as total_debit,
                COALESCE(SUM(je.credit), 0) as total_credit
            FROM accounts a
            LEFT JOIN journal_entries je ON je.account_code = a.code
            WHERE a.code = ?
            GROUP BY a.code
        ");
        $stmt->execute([$account_code]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) return 0;

        if ($row['is_debit']) {
            return $row['total_debit'] - $row['total_credit']; // Aset & Beban
        } else {
            return $row['total_credit'] - $row['total_debit']; // Kewajiban, Ekuitas, Pendapatan
        }
    }
}

 $accounting = new Accounting($pdo);
?>
