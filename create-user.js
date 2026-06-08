import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyATEZW_ALNBv92F-A9hbFwnFWpJDR69V9g",
  authDomain: "pedidos-sorveteria-1e33d.firebaseapp.com",
  projectId: "pedidos-sorveteria-1e33d",
  messagingSenderId: "306306991395",
  appId: "1:306306991395:web:0e9b53d0ba03e76970f896",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// =============================================
// CONFIGURE O USUÁRIO AQUI:
const EMAIL = process.argv[2];
const SENHA = process.argv[3];
const NOME = process.argv[4] || 'Administrador';
const TENANT_ID = process.argv[5] || 'guri_padrao';
const ROLE = process.argv[6] || 'admin';
// =============================================

async function run() {
  if (!EMAIL || !SENHA) {
    console.error('Uso: node create-user.js <email> <senha> [nome] [tenantId] [role]');
    console.error('Exemplo: node create-user.js admin@guri.com.br minhasenha123 "Admin Guri" guri_padrao admin');
    process.exit(1);
  }

  try {
    // Precisa estar autenticado para criar docs
    await signInAnonymously(auth);
    
    // Cria o usuario no Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, EMAIL, SENHA);
    const uid = userCredential.user.uid;
    console.log("Usuario criado no Firebase Auth. UID: " + uid);

    // Cria o perfil do usuario no Firestore
    await setDoc(doc(db, 'users', uid), {
      email: EMAIL,
      name: NOME,
      tenantId: TENANT_ID,
      role: ROLE,
      createdAt: new Date().toISOString(),
    });
    console.log("Perfil criado no Firestore com sucesso!");
    console.log("Email: " + EMAIL);
    console.log("Nome: " + NOME);
    console.log("Tenant: " + TENANT_ID);
    console.log("Role: " + ROLE);
    process.exit(0);
  } catch (err) {
    console.error('Erro ao criar usuario:', err.message);
    process.exit(1);
  }
}

run();
