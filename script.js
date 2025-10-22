// script.js - Menggunakan PHP API untuk seluruh fungsionalitas CRUD dan Absensi

// ==========================================================
// PENTING: SESUAIKAN URL INI!
// Ganti 'e-presensi' dengan nama folder proyek Anda di htdocs XAMPP.
// ==========================================================
const API_URL = 'http://localhost/e-presensi/api.php?resource'; 

// Fungsi Reusable untuk mengambil daftar Ekstrakurikuler dari API
async function fetchEkskulList() {
    try {
        const response = await fetch(`${API_URL}=ekskul`);
        
        // Cek status HTTP
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}. Pastikan server XAMPP berjalan.`);
        }
        
        const data = await response.json();
        
        // Cek jika API mengembalikan pesan error (misal dari config.php)
        if (data && data.message) {
             throw new Error(data.message);
        }
        
        // Cek jika data yang dikembalikan bukan array (kesalahan format data)
        if (!Array.isArray(data)) {
            console.warn("API returned non-array data:", data);
            return [];
        }

        return data;
    } catch (error) {
        console.error("Error fetching ekskul list:", error);
        // Alert ini berguna untuk debugging saat di browser
        // alert(`Gagal mengambil data Ekskul. Cek koneksi API dan folder XAMPP. Error: ${error.message}`);
        return [];
    }
}

// ==========================================================
// HOME (index.html) - MENAMPILKAN STATISTIK & IKON
// ==========================================================
async function updateStats() {
    const statsContainer = document.querySelector('.stat-cards');
    
    // Tampilkan pesan loading di awal
    if (statsContainer) {
        statsContainer.innerHTML = '<p class="text-center text-white">Memuat data statistik...</p>';
    } else {
        return;
    }
    
    // Objek untuk memetakan nama ekskul ke emoji/icon
    const iconMap = {
        'Basket': '🏀',
        'English Club': '📚',
        'Pramuka': '⚜️',
        'Robotik': '🤖',
        'Musik': '🎵',
        'Renang': '🏊',
        'Sepak Bola': '⚽'
    };

    try {
        const ekskulList = await fetchEkskulList();
        
        if (ekskulList.length === 0) {
            statsContainer.innerHTML = '<p class="text-center text-white">Tidak ada data Ekstrakurikuler. Harap tambahkan melalui Dashboard Guru > Kelola Data (CRUD).</p>';
            return;
        }

        statsContainer.innerHTML = '';
        
        for (const ekskul of ekskulList) {
            // Ambil data Siswa dan Absensi per ekskul
            const studentsResponse = await fetch(`${API_URL}=siswa&ekskul_id=${ekskul.id}`);
            const attendanceResponse = await fetch(`${API_URL}=absensi&id=${ekskul.id}`);

            // Pastikan respons adalah JSON
            const students = studentsResponse.ok ? await studentsResponse.json() : [];
            const attendance = attendanceResponse.ok ? await attendanceResponse.json() : [];

            // Gunakan Array.isArray() untuk memastikan data valid
            const total = Array.isArray(students) ? students.length : 0;
            const present = Array.isArray(attendance) ? attendance.length : 0;
            const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

            // Ambil ikon berdasarkan nama ekskul
            const icon = iconMap[ekskul.nama] || '⭐';

            statsContainer.innerHTML += `
                <div class="stat-card bg-light text-dark p-3 rounded shadow-sm">
                    <span style="font-size: 30px;">${icon}</span>
                    <h3 class="mt-2">${ekskul.nama}</h3>
                    <p>Hadir: ${present}/${total} (${percentage}%)</p>
                </div>
            `;
        }
    } catch (error) {
        statsContainer.innerHTML = `<p class="text-center text-danger">Gagal memuat statistik. Pastikan server XAMPP/PHP berjalan. Error: ${error.message}</p>`;
    }
}

// ==========================================================
// DASHBOARD GURU (dashboard.html) - LOG ABSENSI & QR
// ==========================================================
if (window.location.pathname.includes('dashboard.html')) {
    const select = document.getElementById('ekskul-select');
    const qrcodeDiv = document.getElementById('qrcode');
    const logList = document.getElementById('log-list');
    const resetBtn = document.getElementById('reset-btn');

    // Mengisi Dropdown Ekskul
    async function populateEkskulSelect() {
        const ekskulList = await fetchEkskulList();
        select.innerHTML = ''; 

        if (ekskulList.length === 0) {
            select.innerHTML = '<option value="" disabled selected>-- Tidak ada Ekskul --</option>';
            qrcodeDiv.innerHTML = '<p class="text-danger">QR Code tidak tersedia karena data Ekskul kosong.</p>';
            logList.innerHTML = '<li class="list-group-item text-danger">Tidak ada data Ekskul. Harap tambahkan di halaman Manajemen.</li>';
            return;
        }
        
        // Jika ada data, masukkan opsi ke dropdown
        ekskulList.forEach(ekskul => {
            const option = document.createElement('option');
            option.value = ekskul.id; 
            option.textContent = ekskul.nama;
            select.appendChild(option);
        });

        // Trigger QR Code dan Log untuk ekskul pertama secara default
        select.value = ekskulList[0].id;
        generateQR(select.value);
        updateLog();
    }

    // Generate QR Code
            function generateQR(ekskulId) {
                if (!ekskulId) return;
                
                // URL QR Code akan mengarah ke index.html dengan parameter ekskulId
                const url = `${window.location.origin}/e-presensi/index.html?ekskulId=${ekskulId}`; 
                const qrcodeDiv = document.getElementById('qrcode');

                // Kosongkan div sebelum membuat QR baru
                qrcodeDiv.innerHTML = ''; 
                
                // Pastikan QRCode library terload (Objek harus 'QRCode' dengan C kapital)
                if (typeof QRCode !== 'undefined') {
                     new QRCode(qrcodeDiv, {
                         text: url,
                         width: 200,
                         height: 200,
                         colorDark : "#000000",
                         colorLight : "#ffffff",
                         correctLevel : QRCode.CorrectLevel.H 
                     });

                } else {
                    // Pesan error jika gagal dimuat
                    qrcodeDiv.innerHTML = '<p class="text-danger">QRCode library belum terload. Cek tab Network di F12.</p>';
                }
            }


    // Mengambil dan Menampilkan Log Absensi
    async function updateLog() {
        const ekskulId = select.value;
        if (!ekskulId) {
             logList.innerHTML = '<li class="list-group-item text-dark">Pilih Ekskul untuk melihat log.</li>';
             return;
        }
        
        logList.innerHTML = '<li class="list-group-item text-muted">Memuat log...</li>';

        try {
            const response = await fetch(`${API_URL}=absensi&id=${ekskulId}`);
            if (!response.ok) throw new Error('Gagal mengambil log absensi');
            
            const logs = await response.json();
            
            if (!Array.isArray(logs) || logs.length === 0) {
                logList.innerHTML = '<li class="list-group-item text-dark">Belum ada absensi tercatat.</li>';
                return;
            }
            
            logList.innerHTML = '';
            logs.forEach(entry => {
                const time = new Date(entry.timestamp).toLocaleString('id-ID');
                // Mengganti siswa_nama dengan student_name (sesuaikan dengan respons API PHP Anda)
                logList.innerHTML += `<li class="list-group-item text-dark">${entry.siswa_nama || entry.student_name} - ${time}</li>`; 
            });
        } catch (error) {
            logList.innerHTML = `<li class="list-group-item list-group-item-danger">Error: ${error.message}</li>`;
        }
    }

    // Reset Absensi
    resetBtn.addEventListener('click', async () => {
        const ekskulId = select.value;
        if (!ekskulId) { alert('Harap pilih Ekskul.'); return; }
        
        if (!confirm('Anda yakin ingin menghapus SEMUA data absensi untuk ekskul ini? Tindakan ini tidak dapat dibatalkan.')) return;
        
        try {
            // Panggil API dengan method DELETE
            const response = await fetch(`${API_URL}=absensi&id=${ekskulId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) throw new Error('Gagal mereset data absensi');
            
            const data = await response.json();
            alert(data.message);
            updateLog();
        } catch (error) {
            alert(`Gagal mereset: ${error.message}`);
        }
    });

    // Event listener saat dropdown diganti
    select.addEventListener('change', () => {
        generateQR(select.value);
        updateLog();
    });
    
    // Initial load untuk dashboard
    populateEkskulSelect();

} 
// ==========================================================
// MANAJEMEN DATA (manage.html) - LOGIKA CRUD PHP
// ==========================================================
else if (window.location.pathname.includes('manage.html')) {

    const ekskulForm = document.getElementById('ekskul-form');
    const siswaForm = document.getElementById('siswa-form');
    
    // Mengisi Dropdown Ekskul untuk form Tambah Siswa
    async function populateSiswaEkskulSelect() {
        const select = document.getElementById('siswa-ekskul-select');
        const ekskulList = await fetchEkskulList();
        select.innerHTML = '<option value="" disabled selected>Pilih Ekskul</option>';
        ekskulList.forEach(e => {
            select.innerHTML += `<option value="${e.id}">${e.nama}</option>`;
        });
    }

    // Menampilkan daftar Ekskul untuk CRUD
    async function renderEkskulList() {
        const listContainer = document.getElementById('ekskul-list-crud');
        const ekskulList = await fetchEkskulList();
        listContainer.innerHTML = '';
        
        if (ekskulList.length === 0) {
            listContainer.innerHTML = '<li class="list-group-item text-muted">Belum ada Ekstrakurikuler terdaftar.</li>';
        }

        ekskulList.forEach(ekskul => {
            listContainer.innerHTML += `
                <li class="list-group-item d-flex justify-content-between align-items-center text-dark">
                    ${ekskul.nama}
                    <span>
                        <button class="btn btn-sm btn-danger delete-ekskul-btn" data-id="${ekskul.id}">Hapus</button>
                    </span>
                </li>
            `;
        });
        
        // Event listener Hapus Ekskul
        document.querySelectorAll('.delete-ekskul-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;
                if (!confirm('Hapus ekskul ini akan menghapus semua siswa dan log absensinya. Lanjutkan?')) return;
                
                const response = await fetch(`${API_URL}=ekskul&id=${id}`, { method: 'DELETE' });
                const data = await response.json();
                alert(data.message);

                renderEkskulList(); 
                populateSiswaEkskulSelect();
            });
        });
        
        renderSiswaList(); // Update daftar siswa setiap kali ekskul di-render
    }

    // Menampilkan daftar Siswa per Ekskul
    async function renderSiswaList() {
        const siswaContainer = document.getElementById('siswa-list-crud');
        const ekskulList = await fetchEkskulList();
        siswaContainer.innerHTML = '';

        if (ekskulList.length === 0) {
             siswaContainer.innerHTML = '<p class="text-muted">Tidak ada ekskul. Tambahkan ekskul terlebih dahulu untuk mendaftarkan siswa.</p>';
             return;
        }

        for (const ekskul of ekskulList) {
            const studentsResponse = await fetch(`${API_URL}=siswa&ekskul_id=${ekskul.id}`);
            const students = studentsResponse.ok ? await studentsResponse.json() : [];

            let studentListHtml = (Array.isArray(students) && students.length > 0) ? students.map(s => `
                <li class="list-group-item d-flex justify-content-between align-items-center text-dark py-1">
                    ${s.nama}
                    <button class="btn btn-sm btn-outline-danger delete-siswa-btn" data-id="${s.id}">Hapus</button>
                </li>
            `).join('') : '<li class="list-group-item text-muted py-1">Belum ada siswa terdaftar.</li>';
            
            siswaContainer.innerHTML += `
                <h5 class="mt-3 text-dark">${ekskul.nama} (${Array.isArray(students) ? students.length : 0} Siswa)</h5>
                <ul class="list-group mb-3">${studentListHtml}</ul>
            `;
        }
        
        // Event listener Hapus Siswa
        document.querySelectorAll('.delete-siswa-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;
                const response = await fetch(`${API_URL}=siswa&id=${id}`, { method: 'DELETE' });
                const data = await response.json();
                alert(data.message);
                renderSiswaList();
            });
        });
    }

    // Submit Tambah Ekskul
    ekskulForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nama = document.getElementById('ekskul-name').value;
        const response = await fetch(`${API_URL}=ekskul`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nama: nama })
        });
        const data = await response.json();
        alert(data.message);
        document.getElementById('ekskul-name').value = '';
        renderEkskulList();
        populateSiswaEkskulSelect();
    });

    // Submit Tambah Siswa
    siswaForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nama = document.getElementById('siswa-name').value;
        const ekskul_id = document.getElementById('siswa-ekskul-select').value;
        
        if (!ekskul_id) { alert('Harap pilih Ekskul.'); return; }
        
        const response = await fetch(`${API_URL}=siswa`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nama: nama, ekskul_id: ekskul_id })
        });
        const data = await response.json();
        alert(data.message);
        document.getElementById('siswa-name').value = '';
        renderSiswaList();
    });

    // Initial load for management page
    populateSiswaEkskulSelect();
    renderEkskulList();

} 
// ==========================================================
// SIMULASI ABSENSI (Dipanggil dari QR Code link di index.html)
// ==========================================================
else if (window.location.pathname.includes('index.html')) {
    
    // Cek apakah ini halaman absensi dari QR Code
    if (window.location.search.includes('ekskulId=')) {
        const urlParams = new URLSearchParams(window.location.search);
        const ekskulId = urlParams.get('ekskulId');
        
        // Meminta input nama siswa
        const studentName = prompt('Absensi Ekstrakurikuler. Masukkan nama siswa:');
        
        if (studentName) {
            // Panggil API untuk mencatat absensi
            fetch(`${API_URL}=absensi`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ student_name: studentName, ekskul_id: ekskulId })
            })
            .then(response => response.json())
            .then(data => {
                alert(data.message);
                // Setelah absen, kembalikan ke halaman index tanpa parameter URL
                window.location.href = 'index.html'; 
            })
            .catch(error => {
                alert('Absensi gagal: Cek apakah nama siswa benar dan server berjalan.');
                console.error('Absensi error:', error);
            });
        } else {
            // Jika prompt dibatalkan, kembalikan ke halaman index tanpa parameter URL
            window.location.href = 'index.html';
        }
    } else {
        // Jika ini halaman index normal, tampilkan statistik
        updateStats();
    }
}