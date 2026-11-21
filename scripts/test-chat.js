const token = '2a32bcef3d9044fd8e63f244eda5bb0e09d69789ea4cf2d0fb1bc1f28e05e6db';

async function testChat() {
  console.log('1. Creating session for thiet-ke-noi-that...');
  const sessRes = await fetch('http://127.0.0.1:8642/p/thiet-ke-noi-that/api/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ title: 'test-direct-session-' + Date.now() })
  });
  console.log('Session response status:', sessRes.status);
  const sessJson = await sessRes.json();
  console.log('Session JSON:', sessJson);
  const sessionId = sessJson.session?.id ?? sessJson.id;
  if (!sessionId) {
    console.error('No sessionId returned!');
    return;
  }

  console.log('2. Sending message to session:', sessionId);
  const chatRes = await fetch(`http://127.0.0.1:8642/p/thiet-ke-noi-that/api/sessions/${sessionId}/chat/stream`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ message: 'Xin chào, bạn có khỏe không?' })
  });
  console.log('Chat stream status:', chatRes.status);
  const text = await chatRes.text();
  console.log('Stream response (first 500 chars):', text.substring(0, 500));
}

testChat().catch(console.error);
