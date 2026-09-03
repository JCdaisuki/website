import gsap from 'gsap';
import { studiesData, certificatesData, projectsData, creditsData } from './data.js';

export const modals = {
  about: document.querySelector(".modal.about"),
  projects: document.querySelector(".modal.projects"),
  contact: document.querySelector(".modal.contact"),
  credits: document.querySelector(".modal.credits")
};

export function initUI(onModalCloseCallback) {
  document.querySelectorAll(".modal-exit-button").forEach(button => {
    button.addEventListener("click", (e) => {
      const modal = e.target.closest(".modal");
      hideModal(modal, onModalCloseCallback);
    });
  });

  const copyBtn = document.querySelector("#copy-email-btn");
  if (copyBtn) {
    copyBtn.addEventListener("click", copyText);
  }

  renderStudies();
  renderCertificates();
  renderProjects();
  renderCredits();
}

export const showModal = (modal, onModalOpenCallback) => {
  if (!modal) return;
  
  if (onModalOpenCallback) onModalOpenCallback();

  modal.style.display = "block";
  document.body.style.cursor = "default";

  gsap.set(modal, { opacity: 0 });
  gsap.to(modal, { opacity: 1, duration: 0.5 });
};

export const hideModal = (modal, onModalCloseCallback) => {
  if (!modal) return;

  if (onModalCloseCallback) onModalCloseCallback();

  gsap.to(modal, {
    opacity: 0,
    duration: 0.5,
    onComplete: () => {
      modal.style.display = "none";
    }
  });
};

function copyText() {
  const emailInput = document.getElementById("email");
  if (emailInput) {
    emailInput.select();
    emailInput.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(emailInput.value);
  }
}

function renderStudies() {
  const container = document.getElementById("studies-container");
  if (!container) return;

  container.innerHTML = studiesData.map(item => `
    <div class="card">
      <div class="image">
        <img class="certificate-img" src="${item.image}" alt="${item.title}" />
      </div>
      <div class="content">
        <div class="title">${item.title}</div>
        <div class="description">${item.degree}</div>
        <div class="more-description">${item.period}</div>
        <hr style="margin: auto">
        <div class="skills">Skills: ${item.skills}</div>
      </div>
    </div>
  `).join('');
}

function renderCertificates() {
  const container = document.getElementById("certificates-container");
  if (!container) return;

  container.innerHTML = certificatesData.map(item => `
    <div class="card">
      <div class="image">
        <img class="certificate-img" src="${item.image}" alt="${item.title}" />
      </div>
      <div class="content">
        <div class="title">
          ${item.url ? `<a href="${item.url}" target="_blank">${item.title}</a>` : item.title}
        </div>
        <div class="description">${item.issuer}</div>
        <div class="more-description">${item.details}</div>
        <hr style="margin: auto">
        <div class="skills">Skills: ${item.skills}</div>
      </div>
    </div>
  `).join('');
}

function renderProjects() {
  const container = document.getElementById("projects-container");
  if (!container) return;

  container.innerHTML = projectsData.map(item => `
    <div>
      <img src="${item.image}" alt="${item.title}" style="width:${item.width};height:${item.height};">
    </div>
  `).join('');
}

function renderCredits() {
  const container = document.getElementById("credits-container");
  if (!container) return;

  container.innerHTML = creditsData.map(item => `
    <p style="margin-bottom: 1%;">
      <a href="${item.modelUrl}" target="_blank">${item.title}</a> by ${item.author} is licensed under 
      <a href="${item.licenseUrl}" target="_blank">${item.license}</a>.
    </p>
    <hr style="width: 50%; margin: auto;">
  `).join('');
}