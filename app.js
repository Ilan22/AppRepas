let db;

const request = indexedDB.open("mealsDB", 1);

request.onupgradeneeded = (e) => {
  db = e.target.result;
  db.createObjectStore("meals", { keyPath: "id", autoIncrement: true });
};

request.onsuccess = (e) => {
  db = e.target.result;
  loadMeals();
};

function addMeal(meal) {
  const tx = db.transaction("meals", "readwrite");
  tx.objectStore("meals").add(meal);
  tx.oncomplete = loadMeals;
}

function loadMeals() {
  const tx = db.transaction("meals", "readonly");
  const store = tx.objectStore("meals");
  const req = store.getAll();

  req.onsuccess = () => {
    const container = document.getElementById("meals");
    container.innerHTML = "";

    req.result.reverse().forEach((meal) => {
      const div = document.createElement("div");
      div.className = "meal";

      div.innerHTML = `
        <h3>${meal.name}</h3>
        <small>${meal.date}</small>
        ${meal.photo ? `<img src="${meal.photo}" />` : ""}
      `;

      container.appendChild(div);
    });
  };
}

document.getElementById("meal-form").addEventListener("submit", (e) => {
  e.preventDefault();

  const name = nameInput.value;
  const date = dateInput.value;
  const file = photo.files[0];

  if (!file) {
    addMeal({ name, date });
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    addMeal({
      name,
      date,
      photo: reader.result,
    });
  };
  reader.readAsDataURL(file);
});
