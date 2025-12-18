// ------------------------------
// CONFIGURATION SUPABASE
// ------------------------------
const supabaseUrl = "https://vhqftjhtkizimktutsbc.supabase.co"; // Remplace par ton URL
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZocWZ0amh0a2l6aW1rdHV0c2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNTU2NDUsImV4cCI6MjA4MTYzMTY0NX0.Qh8aFMKcP0RgI2P864_51ZVdVZBlDVTwYfPYrKnPz0U"; // Remplace par ta clé publique
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// ------------------------------
// SELECTEURS DOM
// ------------------------------
const titleInput = document.getElementById("title");
const dateInput = document.getElementById("date");
const descriptionInput = document.getElementById("description");
const ingredientsInput = document.getElementById("ingredients");
const photosInput = document.getElementById("photos");
const meals = document.getElementById("meals");
const form = document.getElementById("meal-form");

// ------------------------------
// DATE PAR DÉFAUT = AUJOURD’HUI
// ------------------------------
dateInput.value = new Date().toISOString().split("T")[0];

// ------------------------------
// AJOUTER UN REPAS
// ------------------------------
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = titleInput.value;
  const date = dateInput.value;
  const description = descriptionInput.value;
  const ingredients = ingredientsInput.value;
  const files = photosInput.files;

  // 1️⃣ Ajouter le repas dans Supabase
  const { data: meal, error } = await supabaseClient
    .from("meals")
    .insert([{ title, date, description, ingredients }])
    .select()
    .single();

  if (error) {
    alert("Erreur lors de l'ajout du repas");
    console.error(error);
    return;
  }

  // 2️⃣ Upload des photos
  for (const file of files) {
    const path = `${meal.id}/${crypto.randomUUID()}.jpg`;

    const { error: uploadError } = await supabaseClient.storage
      .from("meal-photos")
      .upload(path, file);

    if (uploadError) {
      console.error("Erreur upload photo :", uploadError);
    }
  }

  // 3️⃣ Reset form et recharger la liste
  form.reset();
  dateInput.value = new Date().toISOString().split("T")[0];
  loadMeals();
});

// ------------------------------
// CHARGER ET AFFICHER LES REPAS
// ------------------------------
async function loadMeals() {
  const { data, error } = await supabaseClient
    .from("meals")
    .select("*")
    .order("date", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  meals.innerHTML = "";

  for (const meal of data) {
    // Liste des photos
    const { data: photos } = await supabaseClient.storage
      .from("meal-photos")
      .list(meal.id);

    const div = document.createElement("div");
    div.className = "meal";

    div.innerHTML = `
      <h3>${meal.title}</h3>
      <small>${meal.date}</small>
      <p>${meal.description || ""}</p>
      <p><b>Ingrédients :</b> ${meal.ingredients || ""}</p>
    `;

    if (photos && photos.length > 0) {
      for (const photo of photos) {
        const { data: publicUrlData } = supabaseClient.storage
          .from("meal-photos")
          .getPublicUrl(`${meal.id}/${photo.name}`);

        div.innerHTML += `<img src="${publicUrlData.publicUrl}" />`;
      }
    }

    meals.appendChild(div);
  }
}

// Charger les repas au démarrage
loadMeals();
