const WHATSAPP_NUMBER = '5541997457028';

const menuButton = document.querySelector('#menuButton');
const mainNav = document.querySelector('#mainNav');
const bookingForm = document.querySelector('#bookingForm');
const dateInput = document.querySelector('#date');
const formSuccess = document.querySelector('#formSuccess');

menuButton?.addEventListener('click', () => {
  const isOpen = mainNav.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(isOpen));
  menuButton.textContent = isOpen ? '×' : '☰';
});

document.querySelectorAll('.main-nav a').forEach((link) => {
  link.addEventListener('click', () => {
    mainNav.classList.remove('open');
    menuButton?.setAttribute('aria-expanded', 'false');
    if (menuButton) menuButton.textContent = '☰';
  });
});

const today = new Date();
const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];
if (dateInput) {
  dateInput.min = localToday;
  dateInput.value = localToday;
}

bookingForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(bookingForm);
  const name = data.get('name')?.toString().trim();
  const service = data.get('service')?.toString();
  const date = data.get('date')?.toString();
  const time = data.get('time')?.toString();
  const message = data.get('message')?.toString().trim();

  if (!name || !service || !date || !time) return;

  const formattedDate = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(new Date(`${date}T12:00:00`));
  const text = [
    'Olá, Casa Navalha! Quero agendar um horário.',
    '',
    `*Nome:* ${name}`,
    `*Serviço:* ${service}`,
    `*Data:* ${formattedDate}`,
    `*Horário:* ${time}`,
    message ? `*Recado:* ${message}` : '',
    '',
    'Fico no aguardo da confirmação. Obrigado!'
  ].filter(Boolean).join('\n');

  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
  formSuccess.textContent = 'Mensagem pronta — abrindo o WhatsApp…';
  window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
});
