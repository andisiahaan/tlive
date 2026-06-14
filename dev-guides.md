# Developer Guide: Integrating Game with TLive Socket

Panduan ini ditujukan bagi Game Developer (menggunakan Unity, Godot, Construct, Web, dll.) yang ingin menghubungkan gamenya dengan server TLive untuk menerima interaksi audiens TikTok secara *real-time*.

## Konsep Dasar
Server TLive memancarkan event TikTok (Chat, Gift, Like, dll.) menggunakan **Socket.io**. Game Anda bertindak sebagai *client* yang melakukan *connect* ke server tersebut.

**PENTING**: Koneksi bersifat *Room-based*. Artinya, game Anda hanya akan menerima data dari username TikTok yang Anda spesifikasikan saat proses *handshake/connect*, asalkan Anda memberikan **API Key** yang valid.

---

## 1. Persiapan Koneksi (Handshake)

Untuk terkoneksi ke server Socket.io, Anda harus mengarahkan *client* Socket.io Anda ke alamat backend (secara default `http://localhost:3001`) dan **wajib** menyertakan 2 buah *query parameter*:

- `username`: Username TikTok target (tanpa `@`).
- `apiKey`: API Key rahasia milik pengguna yang didapatkan dari Dashboard TLive.

### Contoh di JavaScript / Web:
```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:3001", {
  query: {
    username: "nama_akun_tiktok",
    apiKey: "YOUR_API_KEY_HERE"
  }
});
```

### Catatan Keamanan & Otomasi (Auto-Create)
- Jika `apiKey` salah atau tidak dikirim, koneksi game akan **ditolak (rejected)**.
- Jika `username` yang diminta belum ada di *Dashboard*, namun `apiKey`-nya valid, backend akan secara pintar mendaftarkan akun tersebut secara otomatis, lalu segera menyalakan bot untuk mendengarkan TikTok *Live* tersebut!

---

## 2. Mendengarkan Event (Listening to Events)

Satu-satunya nama *event* (*event name*) yang perlu Anda dengarkan adalah: `tiktok_event`.
Di dalam event ini, terdapat properti `eventType` yang membedakan apakah itu *chat*, *gift*, *like*, dsb.

### Contoh Payload Data
Data yang diterima memiliki struktur dasar seperti ini:

```json
{
  "accountId": "uuid-dari-akun",
  "eventType": "chat", // bisa 'chat', 'gift', 'like', 'social', 'member', 'roomUser', 'envelope'
  "data": {
    // Isi data bervariasi tergantung eventType
    "comment": "halo bang",
    "uniqueId": "user_123",
    "nickname": "Si User",
    "profilePictureUrl": "https://..."
  }
}
```

### Contoh Implementasi di Client:
```javascript
socket.on("tiktok_event", (event) => {
    
    // --- 1. Event Chat ---
    if (event.eventType === "chat") {
        const username = event.data.uniqueId;
        const comment = event.data.comment;
        
        console.log(`${username} berkata: ${comment}`);
        
        // Contoh Logika Game
        if (comment.toLowerCase() === "lompat") {
            player.jump();
        }
    }
    
    // --- 2. Event Gift ---
    else if (event.eventType === "gift") {
        // PERHATIAN: Gift dikirim berkelanjutan saat ada kombo. 
        // Sebaiknya tunggu sampai repeatEnd === true jika ingin total kombo terakhir.
        
        const sender = event.data.uniqueId;
        const giftName = event.data.giftName;
        const repeatCount = event.data.repeatCount;
        
        console.log(`${sender} mengirim ${repeatCount}x ${giftName}!`);
        
        if (giftName === "Rose") {
            spawnItem("rose", repeatCount);
        }
    }
    
    // --- 3. Event Like ---
    else if (event.eventType === "like") {
        const likeCount = event.data.likeCount;
        console.log(`Seseorang menekan layar sebanyak ${likeCount} kali!`);
    }
});
```

---

## 3. Disconnect & Smart Resource Management

Saat Anda mematikan game atau memutus koneksi socket, server backend akan mendeteksinya. Jika kebetulan akun TikTok tersebut sedang tidak dipantau melalui Dashboard, server akan secara **otomatis mematikan koneksi ke TikTok Live** demi menghemat pemakaian RAM dan CPU.

Oleh karena itu, sangat disarankan untuk selalu memastikan koneksi `disconnect()` tereksekusi dengan baik saat game ditutup.
