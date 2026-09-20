#target photoshop

function batchResizeToPNG() {
    // 1. Pilih Folder Input
    var inputFolder = Folder.selectDialog("Pilih folder berisi gambar yang ingin di-resize:");
    if (!inputFolder) return; // Batal jika pengguna menutup jendela

    // 2. Pilih Folder Output
    var outputFolder = Folder.selectDialog("Pilih folder tempat menyimpan hasil PNG:");
    if (!outputFolder) return; // Batal jika pengguna menutup jendela

    // Ambil semua file yang ber-ekstensi gambar
    var fileList = inputFolder.getFiles(/\.(jpg|jpeg|png|tif|tiff|psd)$/i);

    if (fileList.length === 0) {
        alert("Tidak ada file gambar yang ditemukan di folder yang dipilih.");
        return;
    }

    // Opsi Ekspor PNG
    var pngOptions = new PNGSaveOptions();
    pngOptions.compression = 6; // Tingkat kompresi (0-9)
    pngOptions.interlaced = false;

    // Matikan pop-up visual sementara agar proses berjalan lebih cepat
    var displayDialogsBackup = app.displayDialogs;
    app.displayDialogs = DialogModes.NO;

    var processedCount = 0;

    for (var i = 0; i < fileList.length; i++) {
        var file = fileList[i];
        
        if (file instanceof File) {
            // Buka Dokumen
            var doc = app.open(file);

            // Set Satuan ke Pixel
            app.preferences.rulerUnits = Units.PIXELS;

            // Resize Image sesuai parameter di screenshot:
            // Width: 2667 px | Height: 4000 px | Resolution: 300 dpi | Resample: Automatic/Bicubic
            doc.resizeImage(
                UnitValue(2667, "px"), 
                UnitValue(4000, "px"), 
                300, 
                ResampleMethod.BICUBICAUTOMATIC
            );

            // Buat Nama File Baru (Menghapus ekstensi lama)
            var originalName = doc.name.substring(0, doc.name.lastIndexOf("."));
            var saveFile = new File(outputFolder + "/" + originalName + ".png");

            // Simpan sebagai PNG
            doc.saveAs(saveFile, pngOptions, true, Extension.LOWERCASE);

            // Tutup Dokumen tanpa menyimpan perubahan ke file asli
            doc.close(SaveOptions.DONOTSAVECHANGES);

            processedCount++;
        }
    }

    // Kembalikan pengaturan modal dialog Photoshop
    app.displayDialogs = displayDialogsBackup;

    alert("Selesai! Berhasil memproses " + processedCount + " foto ke format PNG.");
}

// Jalankan script
batchResizeToPNG();