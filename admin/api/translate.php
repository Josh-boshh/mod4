<?php
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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed.']);
    exit;
}

$target = $_GET['to'] ?? ($_POST['to'] ?? 'en');
$raw = file_get_contents('php://input');
$payload = json_decode($raw, true);

if (!is_array($payload)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid translation payload.']);
    exit;
}

$texts = [];
foreach ($payload as $item) {
    if (is_array($item) && isset($item['Text']) && is_string($item['Text'])) {
        $texts[] = ['Text' => $item['Text']];
    }
}

if (!$texts) {
    http_response_code(400);
    echo json_encode(['error' => 'No text supplied.']);
    exit;
}

$key = getenv('AZURE_TRANSLATE_KEY') ?: '';
$region = getenv('AZURE_TRANSLATE_REGION') ?: 'westeurope';

if ($key === '') {
    http_response_code(503);
    echo json_encode(['error' => 'Translation is not configured.']);
    exit;
}

$endpoint = 'https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=' . urlencode($target);
$headers = [
    'Content-Type: application/json',
    'Ocp-Apim-Subscription-Key: ' . $key,
    'Ocp-Apim-Subscription-Region: ' . $region,
];

$context = stream_context_create([
    'http' => [
        'method' => 'POST',
        'header' => implode("\r\n", $headers),
        'content' => json_encode($texts),
        'ignore_errors' => true,
    ],
]);

$response = file_get_contents($endpoint, false, $context);
$statusLine = $http_response_header[0] ?? '';
preg_match('/\s(\d{3})\s/', $statusLine, $matches);
$status = isset($matches[1]) ? (int)$matches[1] : 502;

if ($response === false || $status < 200 || $status >= 300) {
    http_response_code(502);
    echo json_encode(['error' => 'Unable to translate text.']);
    exit;
}

echo $response;