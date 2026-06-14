# TLive - TikTok Live Interactive Platform 🎮

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

*Read this in [Indonesian (Bahasa Indonesia)](#bahasa-indonesia).*

TLive is a production-ready middleware that bridges TikTok Live streams with external web apps, interactive games, and external services in **real-time**. It acts as a smart proxy that listens to TikTok Live events (Chat, Gift, Like, Follow) and routes them via **Socket.io** or **Webhooks**.

Built with an aggressive focus on **Smart Resource Management**, TLive intelligently auto-disconnects from streams when no clients are listening, saving your server's memory and CPU.

---

## 🔥 Features
- **Real-Time Socket.io Gateway**: Perfect for HTML5/Unity/Godot interactive games.
- **Webhook Forwarding**: Easily integrate TikTok events with Discord, Slack, or any external API.
- **Smart Resource Management**: Automatically connects and disconnects from TikTok servers based on active listeners (SSE, Socket, Webhook).
- **API Key Security**: Secure room-based architecture so game clients only get events they are authorized to receive.
- **Auto-Create Accounts**: Game clients can automatically register TikTok usernames on the fly with a valid API Key.

---

## 🏗️ Architecture
- **Backend**: NestJS, Prisma, BullMQ, Socket.io
- **Frontend (Dashboard)**: Next.js (App Router), TailwindCSS
- **Database**: MySQL, Redis

---

## 🚀 Quick Start (Docker)

The easiest way to run the entire stack is using Docker Compose.

```bash
# 1. Clone the repository
git clone https://github.com/andisiahaan/tlive.git
cd tlive

# 2. Setup Environment Variables
cp .env.example .env

# 3. Start the stack
docker-compose up -d
```
The Dashboard will be available at `http://localhost:3000`.

---

## 💻 Manual Setup (Local Development)

If you prefer to run it manually without Docker:

### Prerequisites
- Node.js (v18+)
- MySQL Server
- Redis Server

### Installation
```bash
# 1. Setup environment variables
cp .env.example .env

# 2. Install dependencies & initialize DB
npm run setup

# 3. Run both Backend & Frontend concurrently
npm run dev
```

---

<h1 id="bahasa-indonesia">TLive - Platform Interaktif TikTok Live 🎮</h1>

TLive adalah *middleware* siap pakai yang menjembatani siaran TikTok Live dengan aplikasi web, game interaktif, maupun servis eksternal secara *real-time*. TLive bertindak sebagai *smart proxy* yang mendengarkan event TikTok Live (Komentar, Gift, Like, Follow) dan menyalurkannya via **Socket.io** atau **Webhooks**.

Didesain dengan fokus pada **Manajemen Resource Cerdas**, TLive akan secara otomatis memutus koneksi dari TikTok saat tidak ada *client* yang sedang mendengarkan, menghemat pemakaian Memori dan CPU server Anda.

---

## 🔥 Fitur Utama
- **Real-Time Socket.io Gateway**: Sangat cocok untuk pengembangan game interaktif HTML5/Unity/Godot.
- **Webhook Forwarding**: Integrasikan event TikTok dengan sistem eksternal dengan mudah.
- **Manajemen Resource Cerdas**: Otomatis *Connect* dan *Disconnect* ke server TikTok berdasarkan jumlah pendengar aktif.
- **API Key Security**: Arsitektur berbasis *room* yang aman.
- **Auto-Create Account**: Game client bisa otomatis mendaftarkan akun TikTok baru selama API Key valid.

## 🚀 Cara Menjalankan
Silakan lihat instruksi bahasa Inggris di atas untuk panduan menggunakan Docker maupun cara setup manual.
