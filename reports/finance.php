<?php
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../accounting/journal.php';

class FinanceReport {
    private $pdo;
    private $accounting;

    public function __construct($pdo, $accounting) {
        $this->pdo = $pdo;
        $this->accounting = $accounting;
    }

    public function getNeraca() {
        // Aset
        $kas = $this->accounting->getAccountBalance('1110');
        $persediaan = $this->accounting->getAccountBalance('1140');
        $aset_tetap = $this->accounting->getAccountBalance('1210');
        $total_aset = $kas + $persediaan + $aset_tetap;

        // Kewajiban
        $utang = $this->accounting->getAccountBalance('2110');

        // Ekuitas
        $modal = $this->accounting->getAccountBalance('3110');
        $laba_berjalan = $this->getLabaRugi(); // Hitung dari Laba Rugi
        $total_ekuitas = $modal + $laba_berjalan;

        $total_pasiva = $utang + $total_ekuitas;

        return [
            'aset' => ['kas' => $kas, 'persediaan' => $persediaan, 'total' => $total_aset],
            'pasiva' => ['utang' => $utang, 'modal' => $modal, 'laba' => $laba_berjalan, 'total' => $total_pasiva],
            'is_balanced' => $total_aset === $total_pasiva // Validasi Standar IAI
        ];
    }

    public function getLabaRugi() {
        $pendapatan_bike = $this->accounting->getAccountBalance('4110');
        $pendapatan_pop = $this->accounting->getAccountBalance('4120');
        $pendapatan_motret = $this->accounting->getAccountBalance('4130');
        $total_pendapatan = $pendapatan_bike + $pendapatan_pop + $pendapatan_motret;

        $hpp = $this->accounting->getAccountBalance('5110');
        $beban_gaji = $this->accounting->getAccountBalance('5210');
        $total_beban = $hpp + $beban_gaji;

        $laba_bersih = $total_pendapatan - $total_beban;
        return $laba_bersih;
    }
}

 $report = new FinanceReport($pdo, $accounting);

// Contoh pemanggilan:
// $neraca = $report->getNeraca();
// print_r($neraca);
?>
