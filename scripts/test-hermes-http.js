const token = '2a32bcef3d9044fd8e63f244eda5bb0e09d69789ea4cf2d0fb1bc1f28e05e6db';

async function test() {
  console.log('Testing root...');
  try {
    const res = await fetch('http://127.0.0.1:8642/deskrpg/profiles', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('/deskrpg/profiles status:', res.status, await res.text());
  } catch (e) {
    console.error('Error /deskrpg/profiles:', e.message);
  }

  try {
    const res = await fetch('http://127.0.0.1:8642/v1/models', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('/v1/models status:', res.status, await res.text());
  } catch (e) {
    console.error('Error /v1/models:', e.message);
  }

  try {
    const res = await fetch('http://127.0.0.1:8642/profiles/thiet-ke-noi-that/v1/models', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('/profiles/thiet-ke-noi-that/v1/models status:', res.status, await res.text());
  } catch (e) {
    console.error('Error /profiles/thiet-ke-noi-that/v1/models:', e.message);
  }

  try {
    const res = await fetch('http://127.0.0.1:8642/profiles/thiet-ke-noi-that/api/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ session_key: 'test-session-key' })
    });
    console.log('POST /profiles/thiet-ke-noi-that/api/sessions status:', res.status, await res.text());
  } catch (e) {
    console.error('Error sessions:', e.message);
  }
}

test();
