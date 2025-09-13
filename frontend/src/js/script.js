
function startVenomTransition(event) {
    event.preventDefault(); // Impede a navegação imediata

    // Ativa a animação da "massa negra" consumindo a tela
    document.querySelector('.venom-transition').classList.add('active');

    // Obtém o link correto do botão
    let targetUrl = event.currentTarget.getAttribute("href");

    // Aguarda a animação e então redireciona
    setTimeout(() => {
        window.location.href = targetUrl;
    }, 1500); // Tempo igual ao da animação
}

function toggleMenu() {
    const menu = document.getElementById('menu');
    const menuIcon = document.querySelector('.menu-icon');
    menu.classList.toggle('open');
    menuIcon.classList.toggle('open');


}

document.getElementById('profileIcon').addEventListener('click', function() {
    const profileOptions = document.getElementById('profileOptions');
    profileOptions.classList.toggle('show');
});

document.querySelectorAll(".gallery-image").forEach(img => {
    img.addEventListener("mouseenter", () => {
        img.style.transform = "scale(1.1)";
    });
    img.addEventListener("mouseleave", () => {
        setTimeout(() => {
            img.style.transform = "scale(1)";
        }, 50); // Pequeno delay para suavizar a transição
    });
});

document.addEventListener("DOMContentLoaded", () => {
    const buttons = document.querySelectorAll(".nav-button");
    const background = document.querySelector(".background"); 
    const images = document.querySelectorAll(".gallery-image"); 
    const textElements = document.querySelectorAll(".content4"); // Pegamos todos os textos

    buttons.forEach(button => {
        button.addEventListener("click", (event) => {
            event.preventDefault(); 
            const targetPage = button.getAttribute("data-target"); 

            // Aplica o efeito no fundo
            background.classList.add("distorted"); 

            // Aplica o efeito nas imagens
            images.forEach(image => {
                image.classList.add("distorted-images");
            });

            // Aplica o efeito nos textos
            textElements.forEach(text => {
                text.classList.add("distorted-text");
            });

            setTimeout(() => {
                window.location.href = targetPage; 
            }, 1200); 
        });
    });
});

// Função para exibir/ocultar o menu de opções
function toggleProfileOptions() {
    const profileOptions = document.getElementById('profileOptions');
    profileOptions.classList.toggle('show');
}

function toggleMenu() {
  const menu = document.getElementById("menu");
  menu.classList.toggle("open");
}
