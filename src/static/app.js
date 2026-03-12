document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const searchInput = document.getElementById("search-input");
  const categoryFilter = document.getElementById("category-filter");
  const sortOrder = document.getElementById("sort-order");

  let activitiesData = [];

  function getSortedActivities(items) {
    const selectedSort = sortOrder.value;
    const sorted = [...items];

    if (selectedSort === "name-asc") {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (selectedSort === "name-desc") {
      sorted.sort((a, b) => b.name.localeCompare(a.name));
    } else if (selectedSort === "time-asc") {
      sorted.sort((a, b) => a.sort_time.localeCompare(b.sort_time));
    } else if (selectedSort === "time-desc") {
      sorted.sort((a, b) => b.sort_time.localeCompare(a.sort_time));
    }

    return sorted;
  }

  function getFilteredActivities() {
    const query = searchInput.value.trim().toLowerCase();
    const selectedCategory = categoryFilter.value;

    return activitiesData.filter((activity) => {
      const matchesCategory =
        selectedCategory === "all" || activity.category === selectedCategory;

      const searchableText = [
        activity.name,
        activity.description,
        activity.schedule,
        activity.category,
      ]
        .join(" ")
        .toLowerCase();

      const matchesQuery = query === "" || searchableText.includes(query);

      return matchesCategory && matchesQuery;
    });
  }

  function renderActivityOptions() {
    activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

    getSortedActivities(activitiesData).forEach((activity) => {
      const option = document.createElement("option");
      option.value = activity.name;
      option.textContent = activity.name;
      activitySelect.appendChild(option);
    });
  }

  function renderCategoryOptions() {
    const categories = [...new Set(activitiesData.map((activity) => activity.category))].sort();
    const currentSelection = categoryFilter.value;

    categoryFilter.innerHTML = '<option value="all">All categories</option>';

    categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      categoryFilter.appendChild(option);
    });

    if (currentSelection && [...categoryFilter.options].some((option) => option.value === currentSelection)) {
      categoryFilter.value = currentSelection;
    }
  }

  function renderActivities() {
    const filtered = getFilteredActivities();
    const visibleActivities = getSortedActivities(filtered);

    activitiesList.innerHTML = "";

    if (visibleActivities.length === 0) {
      activitiesList.innerHTML = "<p>No activities match your filters.</p>";
      return;
    }

    visibleActivities.forEach((activity) => {
      const activityCard = document.createElement("div");
      activityCard.className = "activity-card";

      const spotsLeft =
        activity.max_participants - activity.participants.length;

      const participantsHTML =
        activity.participants.length > 0
          ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${activity.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${activity.name}" data-email="${email}">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
          : `<p><em>No participants yet</em></p>`;

      activityCard.innerHTML = `
          <h4>${activity.name}</h4>
          <p>${activity.description}</p>
          <p><strong>Category:</strong> ${activity.category}</p>
          <p><strong>Schedule:</strong> ${activity.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

      activitiesList.appendChild(activityCard);
    });

    document.querySelectorAll(".delete-btn").forEach((button) => {
      button.addEventListener("click", handleUnregister);
    });
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      activitiesData = Object.entries(activities).map(([name, details]) => ({
        name,
        ...details,
        category: details.category || "General",
        sort_time: details.sort_time || "23:59",
      }));

      renderCategoryOptions();
      renderActivityOptions();
      renderActivities();
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  searchInput.addEventListener("input", renderActivities);
  categoryFilter.addEventListener("change", renderActivities);
  sortOrder.addEventListener("change", () => {
    renderActivities();
    renderActivityOptions();
  });

  // Initialize app
  fetchActivities();
});
