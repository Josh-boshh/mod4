<?php
require_once __DIR__ . '/../config.php';
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed = ['https://defence.gov.ng', 'http://localhost', 'http://127.0.0.1'];
if ($origin && !in_array(rtrim($origin, '/'), $allowed, true)) {
    http_response_code(403);
    echo json_encode(['error' => 'Forbidden.']);
    exit;
}

try {
    runMigrations();
    $rows = getDirectors();
    $bySlug = [];
    foreach ($rows as $row) {
        $bySlug[$row['dept_slug']] = [
            'director'  => $row['director'],
            'role'      => $row['role'],
            'photo_url' => $row['photo_url'],
        ];
    }
    echo json_encode(['directors' => $bySlug]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Unable to load directors.']);
}
