const supabaseUrl = "https://vhqftjhtkizimktutsbc.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZocWZ0amh0a2l6aW1rdHV0c2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNTU2NDUsImV4cCI6MjA4MTYzMTY0NX0.Qh8aFMKcP0RgI2P864_51ZVdVZBlDVTwYfPYrKnPz0U";

const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

document.getElementById("date").value = new Date().toISOString().split("T")[0];

const form = document.getElementById("meal-form");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = titleInput.value;
  const date = dateInput.value;
  const description = descriptionInput.value;
  const ingredients = ingredientsInput.value;
  const files = photosInput.files;

  const { data: meal, error } = await supabase
    .from("meals")
    .insert([{ title, date, description, ingredients }])
    .select()
    .single();

  if (error) {
    alert("Erreur");
    return;
  }

  for (const file of files) {
    const path = `${meal.id}/${crypto.randomUUID()}.jpg`;

    await supabase.storage.from("meal-photos").upload(path, file);
  }

  form.reset();
  loadMeals();
});

async function loadMeals() {
  const { data } = await supabase
    .from("meals")
    .select("*")
    .order("date", { ascending: false });

  meals.innerHTML = "";

  for (const meal of data) {
    const { data: photos } = supabase.storage.from("meal-photos").list(meal.id);

    const div = document.createElement("div");
    div.className = "meal";

    div.innerHTML = `
      <h3>${meal.title}</h3>
      <small>${meal.date}</small>
      <p>${meal.description || ""}</p>
      <p><b>Ingrédients :</b> ${meal.ingredients || ""}</p>
    `;

    if (photos) {
      for (const photo of photos) {
        const { data } = supabase.storage
          .from("meal-photos")
          .getPublicUrl(`${meal.id}/${photo.name}`);

        div.innerHTML += `<img src="${data.publicUrl}">`;
      }
    }

    meals.appendChild(div);
  }
}

loadMeals();
