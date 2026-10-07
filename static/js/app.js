document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("expense-form");
    const tbody = document.getElementById("expenses-tbody");
    const totalSpendingEl = document.getElementById("total-spending");
    const totalEntriesEl = document.getElementById("total-entries");
    const activeCategoriesEl = document.getElementById("active-categories");
    const tableCountEl = document.getElementById("table-count");
    const dateInput = document.getElementById("date");

    // Set today's date in local time as default
    const today = new Date().toISOString().split("T")[0];
    dateInput.value = today;

    let chartInstance = null;

    // Currency Formatter Utility for INR (₹)
    const formatINR = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 2
        }).format(amount);
    };

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

        try {
            const res = await fetch("/api/expenses", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(expense)
            });

            if (res.ok) {
                form.reset();
                dateInput.value = today;
                fetchExpenses();
            } else {
                const err = await res.json();
                alert(err.error || "Failed to add expense.");
            }
        } catch (error) {
            console.error("Error adding expense:", error);
        }
    });

    async function fetchExpenses() {
        try {
            const res = await fetch("/api/expenses");
            const expenses = await res.json();
            renderUI(expenses);
        } catch (error) {
            console.error("Error fetching expenses:", error);
        }
    }

    function renderUI(expenses) {
        tbody.innerHTML = "";
        let total = 0;
        const categoryMap = {};

        if (expenses.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state">No expense records found. Add one above!</td>
                </tr>
            `;
        } else {
            expenses.forEach(exp => {
                total += exp.amount;
                categoryMap[exp.category] = (categoryMap[exp.category] || 0) + exp.amount;

                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${exp.date}</td>
                    <td>${escapeHTML(exp.title)}</td>
                    <td><span class="category-tag">${escapeHTML(exp.category)}</span></td>
                    <td class="amount-text">${formatINR(exp.amount)}</td>
                    <td class="text-right">
                        <button class="btn-delete" onclick="deleteExpense(${exp.id})">Delete</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }

        // Update dashboard metrics
        totalSpendingEl.textContent = formatINR(total);
        totalEntriesEl.textContent = expenses.length;
        activeCategoriesEl.textContent = Object.keys(categoryMap).length;
        tableCountEl.textContent = `${expenses.length} item${expenses.length === 1 ? '' : 's'}`;

        updateChart(categoryMap);
    }

    window.deleteExpense = async function(id) {
        if (!confirm("Are you sure you want to delete this expense?")) return;

        try {
            const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
            if (res.ok) {
                fetchExpenses();
            } else {
                alert("Failed to delete expense.");
            }
        } catch (error) {
            console.error("Error deleting expense:", error);
        }
    };

    function updateChart(categoryData) {
        const ctx = document.getElementById("category-chart").getContext("2d");
        const labels = Object.keys(categoryData);
        const data = Object.values(categoryData);

        if (chartInstance) {
            chartInstance.destroy();
        }

        if (labels.length === 0) {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            return;
        }

        chartInstance = new Chart(ctx, {
            type: "doughnut",
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        "#4318FF", "#6AD2FF", "#EFF4FB", 
                        "#FFB547", "#05CD99", "#E056FD"
                    ],
                    borderWidth: 2,
                    borderColor: "#ffffff"
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { 
                        position: "bottom",
                        labels: {
                            font: { family: "'Plus Jakarta Sans', sans-serif", size: 12 },
                            usePointStyle: true,
                            padding: 15
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return ` ${context.label}: ${formatINR(context.raw)}`;
                            }
                        }
                    }
                },
                cutout: "70%"
            }
        });
    }

    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    }
});