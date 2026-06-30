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
    $tenders = getTenders('tender', true);
    $awards  = getTenders('award', true);

    if (empty($tenders) && empty($awards)) {
        $defaults = defaultTenders();
        $tenders  = array_filter($defaults, fn($d) => $d['type'] === 'tender');
        $awards   = array_filter($defaults, fn($d) => $d['type'] === 'award');
    }

    $fmt = function (array $items) {
        return array_values(array_map(function ($t) {
            $closes = '';
            if ($t['closes_at']) {
                $ts = strtotime($t['closes_at']);
                if ($ts) $closes = date('j M Y', $ts);
            }
            return [
                'id'          => (int)($t['id'] ?? 0),
                'title'       => $t['title'],
                'ref_number'  => $t['ref_number'],
                'category'    => $t['category'],
                'method'      => $t['method'],
                'closes_at'   => $closes,
                'doc_url'     => $t['doc_url'] ? '../' . $t['doc_url'] : '',
                'description' => $t['description'],
            ];
        }, $items));
    };

    echo json_encode(['tenders' => $fmt($tenders), 'awards' => $fmt($awards)]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Unable to load procurement data.']);
}
