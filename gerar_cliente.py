#!/usr/bin/env python3
"""Gera gmstore_dashboard_cliente.html (e index.html para a Hostinger) a partir do admin.

Uso:
  python3 gerar_cliente.py
  GM_TOKEN=EAA... GM_ACCOUNT=act_123 python3 gerar_cliente.py   # versão Hostinger com token fixo
  GM_ACCOUNT=act_123 GM_PROXY_SENHA='<senha do cliente>' python3 gerar_cliente.py
      # Hostinger com intermediário (recomendado): token fica em hostinger/config.php, fora do HTML.
      # GM_TOKEN opcional — sem ele, config.php sai com COLE_AQUI_O_TOKEN para colar no servidor
  GM_VERCEL=1 GM_ACCOUNT=act_123 GM_PROXY_SENHA='<senha do cliente>' python3 gerar_cliente.py
      # Vercel com intermediário: gera vercel/ (index.html, gmstore_dados.js, api/meta.js) e imprime
      # GM_AUTH/GM_CONTA para as variáveis de ambiente; GM_TOKEN é cadastrado direto na Vercel

Sem token: escreve gmstore_dashboard_cliente.html + index.html (versões do repo, sem credencial).
Com token: escreve só hostinger/index.html + hostinger/gmstore_dados.js — pasta fora do git,
para o token nunca ir ao GitHub (repo público).
Com GM_SENHA também (só junto com token): cliente abre SEM senha — a chave já derivada vai
embutida no HTML (a senha em si não aparece). Quem tiver o link vê as vendas.

O admin (gmstore_dashboard_live.html) é a fonte única — nunca edite o cliente à mão.
O cliente lê as vendas de gmstore_dados.js (botão "⬇ Dados cliente" no admin).
"""
import base64
import hashlib
import json
import os
import re
import shutil
from pathlib import Path

DIR = Path(__file__).parent
ADMIN = DIR / 'gmstore_dashboard_live.html'
SAIDAS = [DIR / 'gmstore_dashboard_cliente.html', DIR / 'index.html']


def trocar(html, antigo, novo):
    if html.count(antigo) != 1:
        raise SystemExit(f'Trecho não encontrado (ou repetido) no admin: {antigo!r}')
    return html.replace(antigo, novo)


html = ADMIN.read_text(encoding='utf-8')
html = trocar(html, "const MODO = 'admin';", "const MODO = 'cliente';")
html = trocar(html, '<title>GM Store — Dashboard Live</title>', '<title>GM Store — Relatório de Performance</title>')
# O <script src="gmstore_dados.js"> já vem do admin — os dois leem as vendas desse arquivo

token, conta = os.environ.get('GM_TOKEN', '').strip(), os.environ.get('GM_ACCOUNT', '').strip()
senha_proxy = os.environ.get('GM_PROXY_SENHA', '')
if senha_proxy and conta:
    # Hostinger com intermediário: o token NÃO entra no HTML — fica em config.php, colado no servidor
    if not conta.startswith('act_'):
        conta = 'act_' + conta
    pacote = json.loads(re.search(r'GM_DADOS_CRIPTO = (\{.*?\});', (DIR / 'gmstore_dados.js').read_text(encoding='utf-8')).group(1))
    chave = hashlib.pbkdf2_hmac('sha256', senha_proxy.encode(), base64.b64decode(pacote['salt']), pacote['iter'], 32)
    auth = hashlib.sha256(chave).hexdigest()
    html = trocar(html, "const FIXED_ACCOUNT    = '';", f"const FIXED_ACCOUNT    = '{conta}';")
    if os.environ.get('GM_VERCEL'):
        html = trocar(html, "const PROXY_URL        = '';", "const PROXY_URL        = '/api/meta';")
        pasta = DIR / 'vercel'
        (pasta / 'api').mkdir(parents=True, exist_ok=True)
        SAIDAS = [pasta / 'index.html']
        shutil.copy(DIR / 'gmstore_dados.js', pasta / 'gmstore_dados.js')
        shutil.copy(DIR / 'servidor' / 'vercel' / 'api' / 'meta.js', pasta / 'api' / 'meta.js')
        print('Intermediário Vercel: vercel/ com index.html, gmstore_dados.js, api/meta.js')
        print(f'Variáveis de ambiente: GM_CONTA={conta}  GM_AUTH={auth}  (+ GM_TOKEN, cadastrado na Vercel)')
        for saida in SAIDAS:
            saida.write_text(html, encoding='utf-8')
            print(f'Gerado: {saida.relative_to(DIR)}')
        raise SystemExit(0)
    html = trocar(html, "const PROXY_URL        = '';", "const PROXY_URL        = 'api.php';")
    pasta = DIR / 'hostinger'
    pasta.mkdir(exist_ok=True)
    SAIDAS = [pasta / 'index.html']
    shutil.copy(DIR / 'gmstore_dados.js', pasta / 'gmstore_dados.js')
    shutil.copy(DIR / 'servidor' / 'api.php', pasta / 'api.php')
    shutil.copy(DIR / 'servidor' / '.htaccess', pasta / '.htaccess')
    config = pasta / 'config.php'
    token_atual = ''
    if config.exists():  # regerar não apaga o token já colado
        m = re.search(r"'token'\s*=>\s*'([^']*)'", config.read_text(encoding='utf-8'))
        token_atual = m.group(1) if m else ''
    token_cfg = token or token_atual or 'COLE_AQUI_O_TOKEN'
    config.write_text(
        "<?php\n// Credenciais do intermediário (api.php). NUNCA vai ao GitHub.\n"
        "// Se a senha do cliente mudar, regerar com gerar_cliente.py (o 'auth' muda junto)\n"
        "return [\n"
        f"    'token'  => '{token_cfg}',\n"
        f"    'conta'  => '{conta}',\n"
        "    'versao' => 'v19.0',\n"
        f"    'auth'   => '{auth}',\n"
        "];\n", encoding='utf-8')
    print('Intermediário: hostinger/ com index.html, gmstore_dados.js, api.php, config.php, .htaccess')
    if token_cfg == 'COLE_AQUI_O_TOKEN':
        print('⚠ Cole o token em config.php (no servidor) antes de usar.')
elif token and conta:
    if not conta.startswith('act_'):
        conta = 'act_' + conta
    html = trocar(html, "const FIXED_TOKEN      = '';", f"const FIXED_TOKEN      = '{token}';")
    html = trocar(html, "const FIXED_ACCOUNT    = '';", f"const FIXED_ACCOUNT    = '{conta}';")
    pasta = DIR / 'hostinger'
    pasta.mkdir(exist_ok=True)
    SAIDAS = [pasta / 'index.html']
    shutil.copy(DIR / 'gmstore_dados.js', pasta / 'gmstore_dados.js')
    print('Token fixo embutido — versão Hostinger em hostinger/ (fora do git).')
    senha = os.environ.get('GM_SENHA', '')
    if senha:
        pacote = json.loads(re.search(r'GM_DADOS_CRIPTO = (\{.*?\});', (DIR / 'gmstore_dados.js').read_text(encoding='utf-8')).group(1))
        chave = hashlib.pbkdf2_hmac('sha256', senha.encode(), base64.b64decode(pacote['salt']), pacote['iter'], 32)
        html = trocar(html, "const CHAVE_CLIENTE    = '';", f"const CHAVE_CLIENTE    = '{base64.b64encode(chave).decode()}';")
        print('Cliente sem senha (chave embutida).')
    print('Gerado: hostinger/gmstore_dados.js')

for saida in SAIDAS:
    saida.write_text(html, encoding='utf-8')
    print(f'Gerado: {saida.relative_to(DIR)}')
