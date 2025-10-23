// script.js (VERSI STATIS MENGGUNAKAN LOCAL STORAGE)
// Semua data (ekskul, siswa, absensi) disimpan di browser menggunakan localStorage.

// ----------------------------------------------------------
// FUNGSI UTAMA UNTUK MENGELOLA DATA DI LOCAL STORAGE
// ----------------------------------------------------------

// Inisialisasi data default jika Local Storage kosong
function initDefaultData() {
    // Memberikan ID acak yang lebih tinggi untuk menghindari bentrok dengan data default
    const getNextId = (key) => {
        const list = getData(key);
        return list.length > 0 ? Math.max(...list.map(a => a.id)) + 1 : 1;
    }

    if (!localStorage.getItem('ekskul')) {
        localStorage.setItem('ekskul', JSON.stringify([
            { id: 1, nama: 'Paskibra' },
            { id: 2, nama: 'Futsal' },
            { id: 3, nama: 'Pramuka' }
        ]));
    }
    if (!localStorage.getItem('siswa')) {
        localStorage.setItem('siswa', JSON.stringify([
            { id: 101, nama: 'Rudi Santoso', ekskul_id: 1 },
            { id: 102, nama: 'Siti Aisyah', ekskul_id: 1 },
            { id: 201, nama: 'Bambang Irawan', ekskul_id: 2 },
            { id: 301, nama: 'Ahmad Subarjo', ekskul_id: 3 }
        ]));
    }
    if (!localStorage.getItem('absensi')) {
        localStorage.setItem('absensi', JSON.stringify([
            // Contoh data absensi
            { 
                id: getNextId('absensi'), 
                siswa_nama: 'Rudi Santoso', 
                ekskul_id: 1, 
                timestamp: new Date().toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) 
            }
        ]));
    }
}

// Fungsi untuk mendapatkan semua data dari Local Storage
function getData(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
}

// Fungsi untuk menyimpan data ke Local Storage
function saveData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

// Dashboard & Manage: Ambil daftar Ekskul
function fetchEkskulList() {
    return getData('ekskul');
}

// ==========================
// LOGIKA ABSENSI QR CODE (index.html?ekskulId=...)
// ==========================
function handleQRCodeAttendance() {
    const urlParams = new URLSearchParams(window.location.search);
    const ekskulId = urlParams.get('ekskulId');
    
    if (ekskulId) {
        // Halaman ini diakses melalui QR Code
        const ekskulList = fetchEkskulList();
        const ekskul = ekskulList.find(e => e.id == ekskulId);
        const ekskulName = ekskul ? ekskul.nama : 'Tidak Dikenal';

        // Meminta input nama siswa
        const studentName = prompt(`Absensi Ekstrakurikuler: ${ekskulName}. Masukkan nama siswa:`);
        
        if (studentName) {
            const studentNameClean = studentName.trim();
            const siswaList = getData('siswa');
            
            // Cek apakah siswa terdaftar di ekskul ini
            const isRegistered = siswaList.some(s => 
                s.nama.toLowerCase() === studentNameClean.toLowerCase() && s.ekskul_id == ekskulId
            );

            if (!isRegistered) {
                alert(`Absensi gagal. Siswa "${studentNameClean}" tidak terdaftar di ekskul ${ekskulName}.`);
            } else {
                // Catat absensi
                const absensiList = getData('absensi');
                // ID baru
                const newId = absensiList.length > 0 ? Math.max(...absensiList.map(a => a.id)) + 1 : 1;
                const newAbsensi = { 
                    id: newId, 
                    siswa_nama: studentNameClean, 
                    ekskul_id: parseInt(ekskulId), 
                    // Format tanggal dan waktu untuk tampilan
                    timestamp: new Date().toLocaleString('id-ID', { 
                        day: '2-digit', month: 'short', year: 'numeric', 
                        hour: '2-digit', minute: '2-digit', second: '2-digit' 
                    })
                };
                absensiList.push(newAbsensi);
                saveData('absensi', absensiList);
                alert(`Absensi "${studentNameClean}" untuk ${ekskulName} berhasil dicatat!`);
            }
        } 
        
        // Setelah absen (berhasil/gagal/dibatalkan), kembalikan ke halaman index tanpa parameter URL
        window.location.href = 'index.html';
    }
}


// ==========================
// LOGIKA INDEX.HTML (Tampilkan Statistik)
// ==========================
function updateStats() {
    const statsContainer = document.getElementById('stats');
    if (!statsContainer) return;

    const ekskulList = fetchEkskulList();
    const absensiList = getData('absensi');
    const siswaList = getData('siswa');

    // Menghitung jumlah absensi per ekskul
    const absensiCount = {};
    absensiList.forEach(a => {
        absensiCount[a.ekskul_id] = (absensiCount[a.ekskul_id] || 0) + 1;
    });

    // Menghitung total siswa per ekskul
    const siswaCount = {};
    siswaList.forEach(s => {
        siswaCount[s.ekskul_id] = (siswaCount[s.ekskul_id] || 0) + 1;
    });
    
    statsContainer.innerHTML = ekskulList.map(ekskul => {
        const totalAbsensi = absensiCount[ekskul.id] || 0;
        const totalSiswa = siswaCount[ekskul.id] || 0;
        return `
            <div class="card shadow p-3 mb-3">
                <div class="card-body">
                    <h5 class="card-title">${ekskul.nama}</h5>
                    <p class="card-text">Total Absensi: <b>${totalAbsensi}</b></p>
                    <p class="card-text">Total Siswa Terdaftar: <b>${totalSiswa}</b></p>
                </div>
            </div>
        `;
    }).join('');
}


// ==========================
// LOGIKA DASHBOARD.HTML (QR Code & Log Absensi)
// ==========================
function setupDashboard() {
    const ekskulSelect = document.getElementById('ekskul-select');
    const qrcodeDiv = document.getElementById('qrcode');
    const logList = document.getElementById('log-list');
    const resetBtn = document.getElementById('reset-btn');

    if (!ekskulSelect) return; 

    const ekskulList = fetchEkskulList();

    // 1. Isi Dropdown
    ekskulSelect.innerHTML = '<option value="">Pilih Ekstrakurikuler...</option>';
    ekskulList.forEach(ekskul => {
        const option = document.createElement('option');
        option.value = ekskul.id;
        option.textContent = ekskul.nama;
        ekskulSelect.appendChild(option);
    });

    // 2. Event Listener untuk perubahan Ekskul
    ekskulSelect.addEventListener('change', function() {
        const selectedId = this.value;
        if (selectedId) {
            // Update QR Code
            if (qrcodeDiv) {
                qrcodeDiv.innerHTML = '';
                // Data QR adalah URL ke index.html dengan parameter ekskulId
                const qrData = `${window.location.origin}${window.location.pathname.replace('dashboard.html', 'index.html')}?ekskulId=${selectedId}`;
                
                if (typeof QRCode !== 'undefined') {
                    // Cek qrcode.js (pastikan nama file qrcode.min.js/qrcode.js sudah benar di HTML)
                    new QRCode(qrcodeDiv, {
                        text: qrData,
                        width: 200,
                        height: 200,
                        colorDark : "#000000",
                        colorLight : "#ffffff",
                        correctLevel : QRCode.CorrectLevel.H
                    });
                } else {
                    qrcodeDiv.innerHTML = `<p class="text-danger">Error: qrcode.js belum dimuat atau QRCode tidak terdefinisi.</p>`;
                }
            }

            // Update Log Absensi
            fetchAttendanceLog(selectedId);
            if (resetBtn) resetBtn.style.display = 'block';

        } else {
            if (qrcodeDiv) qrcodeDiv.innerHTML = '';
            if (logList) logList.innerHTML = '';
            if (resetBtn) resetBtn.style.display = 'none';
        }
    });

    // 3. Event Listener untuk Reset Absensi
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            const selectedId = ekskulSelect.value;
            if (selectedId && confirm('Yakin ingin mereset/menghapus semua log absensi untuk ekskul ini? Tindakan ini tidak bisa dibatalkan!')) {
                resetAttendanceLog(selectedId);
            }
        });
    }
}

// Fungsi untuk mendapatkan log absensi dari Local Storage
function fetchAttendanceLog(ekskulId) {
    const logList = document.getElementById('log-list');
    if (!logList) return;
    
    const absensiList = getData('absensi').filter(a => a.ekskul_id == ekskulId);
    absensiList.sort((a, b) => {
        // Mengubah string timestamp menjadi object Date untuk perbandingan
        const dateA = new Date(a.timestamp.replace(/(\d{2})\/(\w+)\/(\d{4}),/, '$2 $1 $3,'));
        const dateB = new Date(b.timestamp.replace(/(\d{2})\/(\w+)\/(\d{4}),/, '$2 $1 $3,'));
        return dateB - dateA; // Urutkan terbaru (DESC)
    });

    logList.innerHTML = '';
    if (absensiList.length === 0) {
        logList.innerHTML = '<li class="list-group-item">Belum ada data absensi untuk ekstrakurikuler ini.</li>';
        return;
    }

    absensiList.forEach(log => {
        const listItem = document.createElement('li');
        listItem.className = 'list-group-item d-flex justify-content-between align-items-center';
        listItem.innerHTML = `
            <span>${log.siswa_nama}</span>
            <span class="badge bg-primary rounded-pill">${log.timestamp}</span>
        `;
        logList.appendChild(listItem);
    });
}

// Fungsi untuk mereset log absensi di Local Storage
function resetAttendanceLog(ekskulId) {
    let absensiList = getData('absensi');
    // Filter keluar entri yang memiliki ekskulId yang sama
    absensiList = absensiList.filter(a => a.ekskul_id != ekskulId);
    saveData('absensi', absensiList);
    alert('Log absensi berhasil direset.');
    fetchAttendanceLog(ekskulId); // Refresh tampilan
}


// ==========================
// LOGIKA MANAGE.HTML (CRUD Sederhana)
// ==========================

// Fungsi untuk membuat/memperbarui/menghapus Ekskul di Local Storage
function manageEkskul(action, id = null, nama = null) {
    let ekskulList = getData('ekskul');
    
    if (action === 'POST') { // Tambah
        const newId = ekskulList.length > 0 ? Math.max(...ekskulList.map(e => e.id)) + 1 : 1;
        ekskulList.push({ id: newId, nama: nama.trim() });
        alert(`Ekstrakurikuler "${nama}" berhasil ditambahkan!`);
    } else if (action === 'DELETE') { // Hapus
        ekskulList = ekskulList.filter(e => e.id != id);
        
        // Hapus juga siswa yang terdaftar di ekskul ini dan log absensi
        let siswaList = getData('siswa');
        siswaList = siswaList.filter(s => s.ekskul_id != id);
        saveData('siswa', siswaList);

        let absensiList = getData('absensi');
        absensiList = absensiList.filter(a => a.ekskul_id != id);
        saveData('absensi', absensiList);

        alert('Ekstrakurikuler, siswa, dan log absensi terkait berhasil dihapus.');
    }
    
    saveData('ekskul', ekskulList);
    renderEkskulListCRUD();
    populateEkskulSelectSiswa(); // Refresh dropdown Siswa
}

// Fungsi untuk membuat/memperbarui/menghapus Siswa di Local Storage
function manageSiswa(action, id = null, nama = null, ekskulId = null) {
    let siswaList = getData('siswa');

    if (action === 'POST') { // Tambah
        const newId = siswaList.length > 0 ? Math.max(...siswaList.map(s => s.id)) + 1 : 1;
        siswaList.push({ id: newId, nama: nama.trim(), ekskul_id: parseInt(ekskulId) });
        alert(`Siswa "${nama}" berhasil ditambahkan ke ekskul!`);
    } else if (action === 'DELETE') { // Hapus
        siswaList = siswaList.filter(s => s.id != id);
        alert('Siswa berhasil dihapus.');
    }
    
    saveData('siswa', siswaList);
    renderSiswaListCRUD();
}


function setupManagePage() {
    const ekskulForm = document.getElementById('ekskul-form');
    const siswaForm = document.getElementById('siswa-form');

    // 1. Setup Form Ekstrakurikuler
    if (ekskulForm) {
        ekskulForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const nama = document.getElementById('ekskul-name').value;
            if (nama) {
                manageEkskul('POST', null, nama);
                ekskulForm.reset();
            }
        });
        renderEkskulListCRUD();
    }

    // 2. Setup Form Siswa
    if (siswaForm) {
        populateEkskulSelectSiswa();
        siswaForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const nama = document.getElementById('siswa-name').value;
            const ekskulId = document.getElementById('siswa-ekskul-select').value;
            if (nama && ekskulId) {
                manageSiswa('POST', null, nama, ekskulId);
                siswaForm.reset();
                document.getElementById('siswa-ekskul-select').value = ''; // Reset select
            } else {
                alert('Nama siswa dan Ekskul harus diisi.');
            }
        });
        renderSiswaListCRUD();
    }
}

// Mengisi dropdown ekskul di form tambah siswa
function populateEkskulSelectSiswa() {
    const select = document.getElementById('siswa-ekskul-select');
    if (!select) return;

    const ekskulList = fetchEkskulList();

    select.innerHTML = '<option value="">Pilih Ekskul</option>';
    ekskulList.forEach(ekskul => {
        const option = document.createElement('option');
        option.value = ekskul.id;
        option.textContent = ekskul.nama;
        select.appendChild(option);
    });
}

// Render daftar Ekstrakurikuler untuk CRUD
function renderEkskulListCRUD() {
    const listContainer = document.getElementById('ekskul-list-crud');
    if (!listContainer) return;

    const ekskulList = fetchEkskulList();

    listContainer.innerHTML = '';
    ekskulList.forEach(ekskul => {
        const listItem = document.createElement('li');
        listItem.className = 'list-group-item d-flex justify-content-between align-items-center';
        listItem.innerHTML = `
            <span>${ekskul.nama}</span>
            <button class="btn btn-sm btn-danger delete-ekskul-btn" data-id="${ekskul.id}">Hapus</button>
        `;
        listContainer.appendChild(listItem);
    });

    listContainer.querySelectorAll('.delete-ekskul-btn').forEach(button => {
        button.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            if (confirm(`Yakin ingin menghapus ekstrakurikuler ini? Semua siswa dan absensi terkait akan ikut terhapus!`)) {
                manageEkskul('DELETE', id);
            }
        });
    });
}

// Render daftar Siswa untuk CRUD (dikelompokkan per Ekskul)
function renderSiswaListCRUD() {
    const listContainer = document.getElementById('siswa-list-crud');
    if (!listContainer) return;

    const ekskulList = fetchEkskulList();
    const siswaList = getData('siswa');

    listContainer.innerHTML = '';
    if (ekskulList.length === 0) {
         listContainer.innerHTML = '<p class="text-muted">Tidak ada ekstrakurikuler yang terdaftar.</p>';
         return;
    }

    ekskulList.forEach(ekskul => {
        const siswaInEkskul = siswaList.filter(s => s.ekskul_id == ekskul.id);
        
        const cardHtml = `
            <div class="card card-body mb-3 bg-light shadow-sm">
                <h5>${ekskul.nama} (${siswaInEkskul.length} Siswa)</h5>
                <ul class="list-group list-group-flush">
                    ${siswaInEkskul.map(siswa => `
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            <span>${siswa.nama}</span>
                            <button class="btn btn-sm btn-danger delete-siswa-btn" data-id="${siswa.id}">Hapus</button>
                        </li>
                    `).join('')}
                    ${siswaInEkskul.length === 0 ? '<li class="list-group-item text-muted">Belum ada siswa terdaftar.</li>' : ''}
                </ul>
            </div>
        `;
        listContainer.insertAdjacentHTML('beforeend', cardHtml);
    });
    
    listContainer.querySelectorAll('.delete-siswa-btn').forEach(button => {
        button.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            if (confirm('Yakin ingin menghapus siswa ini?')) {
                manageSiswa('DELETE', id);
            }
        });
    });
}

// ==========================
// PENGARAH UTAMA
// ==========================
// Panggil inisialisasi dan fungsi berdasarkan halaman
initDefaultData();

document.addEventListener('DOMContentLoaded', function() {
    const path = window.location.pathname;

    if (path.includes('index.html')) {
        handleQRCodeAttendance(); // Cek dan proses QR
        if (!window.location.search.includes('ekskulId=')) {
            updateStats(); // Tampilkan statistik hanya jika bukan halaman hasil scan QR
        }
    } else if (path.includes('dashboard.html')) {
        setupDashboard();
    } else if (path.includes('manage.html')) {
        setupManagePage();
    }
});
