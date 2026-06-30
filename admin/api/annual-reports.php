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
    $reports = getAnnualReports(true);
    if (empty($reports)) $reports = defaultAnnualReports();
    $payload = array_map(function ($r) {
        return [
            'id'          => (int)($r['id'] ?? 0),
            'year'        => (int)$r['year'],
            'title'       => $r['title'],
            'description' => $r['description'],
            'doc_url'     => $r['doc_url'] ? '../' . $r['doc_url'] : '',
            'status'      => $r['status'],
        ];
    }, $reports);
    echo json_encode(['reports' => $payload]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Unable to load reports.']);
}
