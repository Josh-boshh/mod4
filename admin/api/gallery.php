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
    $images = getGalleryImages(true);
    if (empty($images)) {
        $images = defaultGalleryImages();
    }

    $payload = array_map(function ($img) {
        $date = $img['event_date'] ?? null;
        $dateFormatted = '';
        if ($date) {
            $ts = strtotime($date);
            if ($ts !== false) {
                $dateFormatted = date('j F Y', $ts);
            }
        }
        return [
            'id'         => (int)($img['id'] ?? 0),
            'image_url'  => $img['image_url'],
            'alt_text'   => $img['alt_text'],
            'caption'    => $img['caption'],
            'event_date' => $dateFormatted,
            'category'   => $img['category'],
        ];
    }, $images);

    echo json_encode(['images' => $payload]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Unable to load gallery images.']);
}
