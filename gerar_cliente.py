#!/usr/bin/env python3
"""Gera gmstore_dashboard_cliente.html (e index.html para a Hostinger) a partir do admin.

Uso:
  python3 gerar_cliente.py
  GM_TOKEN=EAA... GM_ACCOUNT=act_123 python3 gerar_cliente.py   # versão Hostinger com token fixo

Sem token: escreve gmstore_dashboard_cliente.html + index.html (versões do repo, sem credencial).
Com token: escreve só hostinger/index.html + hostinger/gmstore_dados.js — pasta fora do git,
para o token nunca ir ao GitHub (repo público).

O admin (gmstore_dashboard_live.html) é a fonte única — nunca edite o cliente à mão.
O cliente lê as vendas de gmstore_dados.js (botão "⬇ Dados cliente" no admin).
"""
import os
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
if token and conta:
    if not conta.startswith('act_'):
        conta = 'act_' + conta
    html = trocar(html, "const FIXED_TOKEN      = '';", f"const FIXED_TOKEN      = '{token}';")
    html = trocar(html, "const FIXED_ACCOUNT    = '';", f"const FIXED_ACCOUNT    = '{conta}';")
    pasta = DIR / 'hostinger'
    pasta.mkdir(exist_ok=True)
    SAIDAS = [pasta / 'index.html']
    shutil.copy(DIR / 'gmstore_dados.js', pasta / 'gmstore_dados.js')
    print('Token fixo embutido — versão Hostinger em hostinger/ (fora do git).')
    print('Gerado: hostinger/gmstore_dados.js')

for saida in SAIDAS:
    saida.write_text(html, encoding='utf-8')
    print(f'Gerado: {saida.relative_to(DIR)}')
