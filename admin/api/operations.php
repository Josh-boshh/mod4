<?php
require_once __DIR__ . '/../config.php';
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');
// Only allow requests from same origin
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed = ['https://defence.gov.ng', 'http://localhost', 'http://127.0.0.1'];
if ($origin && !in_array(rtrim($origin, '/'), $allowed, true)) {
    http_response_code(403);
    echo json_encode(['error' => 'Forbidden.']);
    exit;
}

try {
    runMigrations();
    $ops = getOperations(true);
    if (empty($ops)) {
        $ops = defaultOperations();
    }
    $payload = array_map(function ($op) {
        return [
            'id'          => (int)($op['id'] ?? 0),
            'region'      => $op['region'],
            'name'        => $op['name'],
            'description' => $op['description'],
        ];
    }, $ops);
    echo json_encode(['operations' => $payload]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Unable to load operations.']);
}
