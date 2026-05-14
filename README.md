# SkillQuest - Sistema de Aprendizado Gamificado

Um sistema web gamificado para aprendizado interativo, desenvolvido com Flask, SQLite e interface moderna com Tailwind CSS.

## 🚀 Deploy no Render

### Pré-requisitos
- Conta no [Render](https://render.com)
- Repositório Git com o código do projeto

### Passo a Passo do Deploy

#### 1. Conecte seu Repositório
1. Acesse [dashboard.render.com](https://dashboard.render.com)
2. Clique em "New" → "Web Service"
3. Conecte seu repositório Git (GitHub/GitLab/Bitbucket)

#### 2. Configure o Serviço
Preencha as seguintes configurações:

**Basic Settings:**
- **Name:** `skillquest` (ou nome de sua preferência)
- **Runtime:** `Python 3`
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `python app.py`

**Environment Variables:**
Adicione estas variáveis de ambiente:

```
FLASK_ENV=production
SECRET_KEY=<gere-uma-chave-segura-aqui>
DATABASE_URL=sqlite:///skillquest.db
```

> **Dica:** Para gerar uma SECRET_KEY segura, use Python:
> ```bash
> python -c "import secrets; print(secrets.token_hex(32))"
> ```

#### 3. Deploy
1. Clique em "Create Web Service"
2. Aguarde o build e deploy (pode levar alguns minutos)
3. Seu app estará disponível em uma URL como: `https://skillquest.onrender.com`

### Arquivos de Configuração

O projeto já está configurado com os arquivos necessários:

- `requirements.txt` - Todas as dependências Python
- `render.yaml` - Configuração opcional do Render (Blueprint)
- `.env.example` - Exemplo de variáveis de ambiente

### Configurações de Produção

O app já está configurado para produção:
- ✅ Variáveis de ambiente
- ✅ Porta dinâmica do Render
- ✅ Host 0.0.0.0
- ✅ Debug desabilitado em produção

## 🎮 Como Usar

1. Acesse a URL do seu deploy
2. Crie uma conta ou faça login
3. Faça upload de um arquivo JSON com perguntas
4. Comece a aprender jogando!

### Formato do JSON de Perguntas

```json
[
  {
    "pergunta": "O que é uma API?",
    "opcoes": [
      "Um banco de dados",
      "Interface de Programação de Aplicações",
      "Uma linguagem de programação",
      "Um sistema operacional"
    ],
    "resposta_correta": 1
  }
]
```

## 🛠️ Desenvolvimento Local

```bash
# Clone o repositório
git clone <seu-repo>
cd skillquest

# Crie ambiente virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou venv\Scripts\activate  # Windows

# Instale dependências
pip install -r requirements.txt

# Execute
python app.py
```

Acesse: http://localhost:5000

## 📋 Funcionalidades

- ✅ Sistema de autenticação
- ✅ Gamificação com XP e níveis
- ✅ Ranking global
- ✅ Upload de questões via JSON
- ✅ Tema dark/light
- ✅ Interface responsiva
- ✅ Efeitos visuais e sons
- ✅ Sistema de streak
- ✅ Revisão de erros

## 🗄️ Banco de Dados

O sistema usa SQLite para armazenar:
- Usuários e senhas (hash)
- Progresso (XP, nível, módulos)
- Dados do jogo

## 🔒 Segurança

- Senhas criptografadas com Werkzeug
- Sessões seguras
- Validação de entrada
- Proteção CSRF

---

**SkillQuest** - Aprenda jogando! 🎯