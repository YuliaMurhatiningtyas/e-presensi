<?php
// api.php - Mengelola semua endpoint CRUD

include 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$resource = isset($_GET['resource']) ? sanitize($conn, $_GET['resource']) : '';
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;

switch ($resource) {
    case 'ekskul':
        handleEkskulRequest($conn, $method, $id);
        break;
    case 'siswa':
        handleSiswaRequest($conn, $method, $id);
        break;
    case 'absensi':
        handleAbsensiRequest($conn, $method, $id);
        break;
    default:
        http_response_code(404);
        echo json_encode(["message" => "Resource not found."]);
}

function handleEkskulRequest($conn, $method, $id) {
    if ($method == 'GET') {
        $result = $conn->query("SELECT id, nama FROM ekskul ORDER BY nama");
        $ekskul_list = [];
        while ($row = $result->fetch_assoc()) {
            $ekskul_list[] = $row;
        }
        echo json_encode($ekskul_list);
    } elseif ($method == 'POST') {
        $data = json_decode(file_get_contents("php://input"));
        $nama = sanitize($conn, $data->nama);
        
        if ($conn->query("INSERT INTO ekskul (nama) VALUES ('$nama')")) {
            echo json_encode(["message" => "Ekskul $nama berhasil ditambahkan!", "id" => $conn->insert_id]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Gagal menambahkan ekskul: " . $conn->error]);
        }
    } elseif ($method == 'DELETE' && $id) {
        // Karena ada ON DELETE CASCADE di database, siswa dan absensi terkait akan terhapus otomatis
        if ($conn->query("DELETE FROM ekskul WHERE id = $id")) {
            echo json_encode(["message" => "Ekskul ID $id berhasil dihapus."]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Gagal menghapus ekskul: " . $conn->error]);
        }
    } else {
        http_response_code(405);
        echo json_encode(["message" => "Method not allowed."]);
    }
}

function handleSiswaRequest($conn, $method, $id) {
    if ($method == 'GET') {
        $ekskul_id = isset($_GET['ekskul_id']) ? (int)$_GET['ekskul_id'] : null;
        if ($ekskul_id) {
            $result = $conn->query("SELECT id, nama, ekskul_id FROM siswa WHERE ekskul_id = $ekskul_id ORDER BY nama");
        } else {
            http_response_code(400);
            echo json_encode(["message" => "Missing ekskul_id parameter."]);
            return;
        }

        $siswa_list = [];
        while ($row = $result->fetch_assoc()) {
            $siswa_list[] = $row;
        }
        echo json_encode($siswa_list);

    } elseif ($method == 'POST') {
        $data = json_decode(file_get_contents("php://input"));
        $nama = sanitize($conn, $data->nama);
        $ekskul_id = (int)$data->ekskul_id;
        
        if ($conn->query("INSERT INTO siswa (nama, ekskul_id) VALUES ('$nama', $ekskul_id)")) {
            echo json_encode(["message" => "Siswa $nama berhasil ditambahkan!"]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Gagal menambahkan siswa: " . $conn->error]);
        }
    } elseif ($method == 'DELETE' && $id) {
        if ($conn->query("DELETE FROM siswa WHERE id = $id")) {
            echo json_encode(["message" => "Siswa ID $id berhasil dihapus."]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Gagal menghapus siswa: " . $conn->error]);
        }
    } else {
        http_response_code(405);
        echo json_encode(["message" => "Method not allowed."]);
    }
}

function handleAbsensiRequest($conn, $method, $id) {
    if ($method == 'POST') {
        $data = json_decode(file_get_contents("php://input"));
        $student_name = sanitize($conn, $data->student_name);
        $ekskul_id = (int)$data->ekskul_id;
        
        // Cek apakah siswa terdaftar
        $siswa_check = $conn->query("SELECT id FROM siswa WHERE nama = '$student_name' AND ekskul_id = $ekskul_id");
        if ($siswa_check->num_rows == 0) {
            http_response_code(400);
            echo json_encode(["message" => "Absensi gagal. Siswa tidak terdaftar di ekstrakurikuler ini."]);
            return;
        }

        $sql = "INSERT INTO absensi (siswa_nama, ekskul_id) VALUES ('$student_name', $ekskul_id)";
        if ($conn->query($sql)) {
            echo json_encode(["message" => "Absensi berhasil dicatat!"]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Gagal mencatat absensi: " . $conn->error]);
        }

    } elseif ($method == 'GET' && $id) {
        // Ambil log absensi berdasarkan ID ekskul
        $result = $conn->query("SELECT siswa_nama, timestamp FROM absensi WHERE ekskul_id = $id ORDER BY timestamp DESC");
        $logs = [];
        while ($row = $result->fetch_assoc()) {
            $logs[] = $row;
        }
        echo json_encode($logs);
    } elseif ($method == 'DELETE' && isset($_GET['reset']) && $_GET['reset'] == 'true' && $id) {
        // Reset/Hapus semua log absensi untuk Ekskul tertentu
        if ($conn->query("DELETE FROM absensi WHERE ekskul_id = $id")) {
             echo json_encode(["message" => "Log absensi berhasil direset."]);
        } else {
            http_response_code(500);
            echo json_encode(["message" => "Gagal mereset absensi: " . $conn->error]);
        }
    } else {
        http_response_code(405);
        echo json_encode(["message" => "Method not allowed."]);
    }
}

$conn->close();
?>