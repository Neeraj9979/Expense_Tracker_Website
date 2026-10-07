document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("expense-form");
    const tbody = document.getElementById("expenses-tbody");
    const totalSpendingEl = document.getElementById("total-spending");
    const totalEntriesEl = document.getElementById("total-entries");
    const dateInput = document.getElementById("date");

    // Set today as default date input
    dateInput.value = new Date().toISOString().split("T")[0];

    let chartInstance = null;

    // Fetch and render initial expense data
    fetchExpenses();

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const expense = {
            title: document.getElementById("title").value.trim(),
            amount: parseFloat(document.getElementById("amount").value),
            category: document.getElementById("category").value,
            date: document.getElementById("date").value
        };

        const res = await fetch("/api/expenses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(expense)
        });

        if (res.ok) {
            form.reset();
            dateInput.value = new Date().toISOString().split("T")[0];
            fetchExpenses();
        }
    });

    async function fetchExpenses() {
        const res = await fetch("/api/expenses");
        const expenses = await res.json();
        renderUI(expenses);
    }

    function renderUI(expenses) {
        tbody.innerHTML = "";
        let total = 0;
        const categoryMap = {};

        expenses.forEach(exp => {
            total += exp.amount;
            categoryMap[exp.category] = (categoryMap[exp.category] || 0) + exp.amount;

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${exp.date}</td>
                <td>${exp.title}</td>
                <td>${exp.category}</td>
                <td>$${exp.amount.toFixed(2)}</td>
                <td><button class="btn-delete" onclick="deleteExpense(${exp.id})">Delete</button></td>
            `;
            tbody.appendChild(tr);
        });

        totalSpendingEl.textContent = `$${total.toFixed(2)}`;
        totalEntriesEl.textContent = expenses.length;

        updateChart(categoryMap);
    }

    window.deleteExpense = async function(id) {
        const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
        if (res.ok) {
            fetchExpenses();
        }
    };

    function updateChart(categoryData) {
        const ctx = document.getElementById("category-chart").getContext("2d");
        const labels = Object.keys(categoryData);
        const data = Object.values(categoryData);

        if (chartInstance) {
            chartInstance.destroy();
        }

        chartInstance = new Chart(ctx, {
            type: "doughnut",
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        "#FF6384", "#36A2EB", "#FFCE56", 
                        "#4BC0C0", "#9966FF", "#FF9F40"
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: "bottom" }
                }
            }
        });
    }
});