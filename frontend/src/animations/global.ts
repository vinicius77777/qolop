
export function createParticles(containerId: string): void {
  const container = document.getElementById(containerId);
  if (!container) return;

 

  const colors = ["#00BFFF", "#1E90FF", "#4682B4", "#191970"];
  for (let i = 0; i < 50; i++) {
    const particle = document.createElement("div");
    const size = Math.random() * 4 + 2; // 2px a 6px
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.borderRadius = "50%";
    particle.style.background = colors[Math.floor(Math.random() * colors.length)];
    particle.style.position = "absolute";
    particle.style.top = `${Math.random() * 100}%`;
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.opacity = "0.7";
    particle.style.animation = `floatParticle ${5 + Math.random() * 5}s linear infinite`;
    container.appendChild(particle);
  }
}

export function initHamburgerMenu() {
  const trigger = document.getElementById('hamburger');
  if (!trigger) return;

  trigger.addEventListener('click', () => {
    trigger.classList.toggle('is-open');
  });
}



