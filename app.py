from flask import Flask, request, jsonify, render_template, session
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
import json
import os
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

app = Flask(__name__)
# Chave secreta para a sessão (usa variável de ambiente em produção)
app.secret_key = os.getenv('SECRET_KEY', 'skillquest_super_secret_key_123')
DB_FILE = os.getenv('DATABASE_URL', 'skillquest.db').replace('sqlite:///', '')

def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db() as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                xp INTEGER DEFAULT 0,
                level INTEGER DEFAULT 1,
                modules_data TEXT DEFAULT '[]'
            )
        ''')
        conn.commit()

init_db()

@app.route('/')
def index():
    return render_template('index.html')

# --- ROTAS DE AUTENTICAÇÃO E PERFIL ---

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'error': 'Preencha todos os campos.'}), 400
        
    hashed_password = generate_password_hash(password)
    
    try:
        with get_db() as conn:
            conn.execute('INSERT INTO users (username, password) VALUES (?, ?)', (username, hashed_password))
            conn.commit()
        return jsonify({'success': True, 'message': 'Conta criada com sucesso!'})
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Nome de usuário já existe.'}), 400

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    with get_db() as conn:
        user = conn.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
        
    if user and check_password_hash(user['password'], password):
        session['user_id'] = user['id']
        session['username'] = user['username']
        return jsonify({'success': True})
    
    return jsonify({'error': 'Usuário ou senha incorretos.'}), 401

@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'success': True})

@app.route('/api/edit_profile', methods=['POST'])
def edit_profile():
    if 'user_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401
    
    data = request.json
    new_username = data.get('username')
    new_password = data.get('password')
    
    if not new_username:
        return jsonify({'error': 'O nome de usuário não pode ficar vazio.'}), 400
        
    try:
        with get_db() as conn:
            if new_password: # Atualiza nome e senha
                hashed_password = generate_password_hash(new_password)
                conn.execute('UPDATE users SET username = ?, password = ? WHERE id = ?', 
                             (new_username, hashed_password, session['user_id']))
            else: # Atualiza apenas o nome
                conn.execute('UPDATE users SET username = ? WHERE id = ?', 
                             (new_username, session['user_id']))
            conn.commit()
            
        session['username'] = new_username
        return jsonify({'success': True, 'username': new_username})
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Este nome de usuário já está em uso.'}), 400

# --- ROTAS DE DADOS DO JOGO ---

@app.route('/api/userdata', methods=['GET'])
def get_userdata():
    if 'user_id' not in session:
        return jsonify({'authenticated': False}), 401
        
    with get_db() as conn:
        user = conn.execute('SELECT username, xp, level, modules_data FROM users WHERE id = ?', (session['user_id'],)).fetchone()
        
    if user:
        return jsonify({
            'authenticated': True,
            'username': user['username'],
            'xp': user['xp'],
            'level': user['level'],
            'modules': json.loads(user['modules_data'])
        })
    return jsonify({'authenticated': False}), 401

@app.route('/api/sync', methods=['POST'])
def sync_data():
    if 'user_id' not in session:
        return jsonify({'error': 'Não autenticado'}), 401
        
    data = request.json
    xp = data.get('xp', 0)
    level = data.get('level', 1)
    modules = json.dumps(data.get('modules', []))
    
    with get_db() as conn:
        conn.execute('UPDATE users SET xp = ?, level = ?, modules_data = ? WHERE id = ?', 
                     (xp, level, modules, session['user_id']))
        conn.commit()
        
    return jsonify({'success': True})

@app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard():
    try:
        with get_db() as conn:
            users = conn.execute('SELECT username, xp, level FROM users ORDER BY xp DESC LIMIT 50').fetchall()
            
        leaderboard = []
        for index, user in enumerate(users):
            level = user['level']
            
            if level < 5:
                league, icon, color = 'Bronze', '🥉', 'text-amber-600 dark:text-amber-500'
            elif level < 15:
                league, icon, color = 'Prata', '🥈', 'text-slate-400 dark:text-slate-300'
            elif level < 30:
                league, icon, color = 'Ouro', '🥇', 'text-yellow-500'
            else:
                league, icon, color = 'Diamante', '💎', 'text-cyan-400'
                
            leaderboard.append({
                'rank': index + 1,
                'username': user['username'],
                'xp': user['xp'],
                'level': level,
                'league_name': league,
                'league_icon': icon,
                'league_color': color
            })
            
        return jsonify({'success': True, 'leaderboard': leaderboard})
    except Exception as e:
        print("Erro interno no leaderboard:", e)
        return jsonify({'success': False, 'error': str(e)}), 500

# --- ROTA DE UPLOAD DE JSON ---
@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'Nenhum arquivo enviado.'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'Nenhum arquivo selecionado.'}), 400
    try:
        data = json.load(file)
        if not isinstance(data, list):
            return jsonify({'error': 'O JSON deve ser uma lista.'}), 400
        for index, item in enumerate(data):
            if not all(key in item for key in ('pergunta', 'opcoes', 'resposta_correta')):
                return jsonify({'error': f'Item {index} incompleto.'}), 400
            if not isinstance(item['opcoes'], list) or len(item['opcoes']) != 4:
                return jsonify({'error': f'A pergunta {index} deve ter 4 opções.'}), 400
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        return jsonify({'error': 'JSON inválido.'}), 400

if __name__ == '__main__':
    # Configurações para produção
    port = int(os.getenv('PORT', 5001))
    debug = os.getenv('FLASK_ENV') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug)