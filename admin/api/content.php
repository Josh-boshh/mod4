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
    $slides = getHeroSlides(true);
    $pressItems = getPressItems(true);
    $leadership = getLeadership(true);
    $settings = [
        'hero_eyebrow' => getSetting('hero_eyebrow', 'Federal Republic of Nigeria'),
        'hero_headline' => getSetting('hero_headline', 'Defending the sovereignty of Nigeria.'),
        'hero_body' => getSetting('hero_body', 'The Ministry of Defence — the apex policy authority overseeing the Nigerian Armed Forces — provides strategic leadership for a modern, professional, mission-ready military in the service of more than 220 million citizens of the Federal Republic.'),
        'last_reviewed' => getSetting('last_reviewed', 'June 2026'),
        'ministry_name' => getSetting('ministry_name', 'Ministry of Defence'),
        'country' => getSetting('country', 'Federal Republic of Nigeria'),
    ];
    $social = getSocialLinks();

    $leadershipMap = [
        'minister' => [],
        'ministerOfState' => [],
        'permSec' => [],
    ];
    foreach ($leadership as $item) {
        if (isset($leadershipMap[$item['position_key']])) {
            $leadershipMap[$item['position_key']] = [
                'title' => $item['title'],
                'name' => $item['name'],
                'bio' => $item['bio'],
                'photo' => $item['photo_url'],
                'profile_link' => $item['profile_link'],
            ];
        }
    }

    $payload = [
        'hero' => [
            'eyebrow' => $settings['hero_eyebrow'],
            'headline' => $settings['hero_headline'],
            'body' => $settings['hero_body'],
        ],
        'slides' => array_map(function ($slide) {
            return [
                'img' => $slide['image_url'],
                'alt' => $slide['alt_text'],
                'role' => $slide['role_text'],
                'name' => $slide['caption_text'],
            ];
        }, $slides),
        'press' => array_map(function ($item) {
            $date = $item['published_at'] ?? '';
            if ($date) {
                $timestamp = strtotime($date);
                if ($timestamp !== false) {
                    $date = date('j F Y', $timestamp);
                }
            }
            return [
                'title' => $item['title'],
                'excerpt' => $item['excerpt'],
                'body' => $item['body'] ?? '',
                'category' => $item['category'],
                'date' => $date,
                'img' => $item['image_url'],
                'url' => 'press-release.html?slug=' . urlencode($item['slug']),
                'slug' => $item['slug'],
            ];
        }, $pressItems),
        'leadership' => [
            'minister' => $leadershipMap['minister'],
            'ministerOfState' => $leadershipMap['ministerOfState'],
            'permSec' => $leadershipMap['permSec'],
        ],
        'settings' => $settings,
        'social' => $social,
    ];

    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Unable to load content.']);
}
