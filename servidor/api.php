<?php
// Intermediário entre o painel do cliente e o Meta: o token fica só no servidor (config.php).
// O painel manda ?path=<endpoint>&<parâmetros> + cabeçalho X-GM-Auth; aqui só passam leituras
// da conta configurada, com os parâmetros que o painel usa.
ini_set('display_errors', '0');   // avisos do PHP nunca vão para a resposta
$cfg = require __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function falha($codigo, $msg) {
    http_response_code($codigo);
    echo json_encode(['error' => ['message' => $msg]]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') falha(405, 'Método não permitido');
if (empty($cfg['token']) || strpos($cfg['token'], 'COLE_') === 0) falha(503, 'Dashboard em configuração. Fale com a Vem no Digital.');

// X-GM-Auth = sha256 da chave que decifra gmstore_dados.js — só quem sabe a senha do cliente tem
$auth = $_SERVER['HTTP_X_GM_AUTH'] ?? '';
if (!is_string($auth) || !hash_equals($cfg['auth'], $auth)) falha(401, 'Sessão expirada. Entre de novo com a senha.');

$conta = $cfg['conta'];
$path  = $_GET['path'] ?? '';
$ehDaConta  = (bool) preg_match('#^' . preg_quote($conta, '#') . '/(insights|ads)$#', $path);
$ehAnuncio  = (bool) preg_match('#^\d{5,25}$#', $path);   // prévia (thumbnail) de um anúncio
if (!$ehDaConta && !$ehAnuncio) falha(403, 'Consulta não permitida');

$permitidos = ['fields', 'time_range', 'level', 'limit', 'after'];
$params = [];
foreach ($permitidos as $p) {
    if (isset($_GET[$p]) && is_string($_GET[$p])) $params[$p] = $_GET[$p];
}
if ($ehAnuncio) {
    // Só a prévia do criativo, e só de anúncio que pertence à conta da GM
    $params = ['fields' => 'account_id,creative{thumbnail_url,image_url}'];
}
$params['access_token'] = $cfg['token'];

$base = $cfg['base'] ?? 'https://graph.facebook.com/';   // 'base' só para testes locais
$ch = curl_init($base . $cfg['versao'] . '/' . $path . '?' . http_build_query($params));
curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 60, CURLOPT_CONNECTTIMEOUT => 10]);
$corpo = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
if ($corpo === false) falha(502, 'Meta indisponível. Tente de novo em instantes.');

$dados = json_decode($corpo, true);
if (!is_array($dados)) falha(502, 'Resposta inválida do Meta');

if ($ehAnuncio && !isset($dados['error'])) {
    if (('act_' . ($dados['account_id'] ?? '')) !== $conta) falha(403, 'Consulta não permitida');
    unset($dados['account_id']);
}
// O link "next" do Meta traz o token: sai daqui, e o painel pagina pelo cursor "after"
if (isset($dados['paging']['next'])) {
    unset($dados['paging']['next']);
    $dados['paging']['tem_mais'] = true;
}
unset($dados['paging']['previous']);

http_response_code($status);
echo json_encode($dados);
