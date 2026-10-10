document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("expense-form");
    const tbody = document.getElementById("expenses-tbody");
    const totalSpendingEl = document.getElementById("total-spending");
    const totalEntriesEl = document.getElementById("total-entries");
    const activeCategoriesEl = document.getElementById("active-categories");
    const tableCountEl = document.getElementById("table-count");
    const dateInput = document.getElementById("date");

    // Budget Elements
    const budgetInput = document.getElementById("budget-limit-input");
    const btnSaveBudget = document.getElementById("btn-save-budget");
    const budgetStatusText = document.getElementById("budget-status-text");
    const budgetPercentText = document.getElementById("budget-percent-text");
    const budgetProgressFill = document.getElementById("budget-progress-fill");
    const budgetBanner = document.getElementById("budget-banner");
    const bannerIcon = document.getElementById("banner-icon");
    const bannerText = document.getElementById("banner-text");

    // Load saved budget limit from LocalStorage or default to ₹20,000
    let monthlyBudget = parseFloat(localStorage.getItem("monthlyBudget")) || 20000;
    budgetInput.value = monthlyBudget;

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

    fetchExpenses();

    // Event listener to set custom monthly budget
    btnSaveBudget.addEventListener("click", () => {
        const val = parseFloat(budgetInput.value);
        if (val && val > 0) {
            monthlyBudget = val;
            localStorage.setItem("monthlyBudget", monthlyBudget);
            fetchExpenses();
        } else {
            alert("Please enter a valid positive budget amount.");
        }
    });

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
                alert(err.error || "Failed to log transaction.");
            }
        } catch (error) {
            console.error("Error saving expense:", error);
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
                    <td colspan="5" class="empty-msg">No transactions found. Log one above to get started!</td>
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
                    <td><span class="tag-pill">${escapeHTML(exp.category)}</span></td>
                    <td class="amount-text">${formatINR(exp.amount)}</td>
                    <td class="text-right">
                        <button class="btn-delete" onclick="deleteExpense(${exp.id})">Delete</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }

        // Update Metrics
        totalSpendingEl.textContent = formatINR(total);
        totalEntriesEl.textContent = expenses.length;
        activeCategoriesEl.textContent = Object.keys(categoryMap).length;
        tableCountEl.textContent = `${expenses.length} item${expenses.length === 1 ? '' : 's'}`;

        // Update Budget Limit Controls & Alerts
        updateBudgetUI(total);

        // Update Doughnut Chart
        updateChart(categoryMap);
    }

    function updateBudgetUI(totalSpent) {
        const percentage = Math.min((totalSpent / monthlyBudget) * 100, 100);
        const percentFormatted = Math.round((totalSpent / monthlyBudget) * 100);

        budgetStatusText.textContent = `Spent ${formatINR(totalSpent)} of ${formatINR(monthlyBudget)}`;
        budgetPercentText.textContent = `${percentFormatted}%`;
        budgetProgressFill.style.width = `${percentage}%`;

        // Reset progress bar & banner classes
        budgetProgressFill.className = "progress-bar-fill";
        budgetBanner.className = "budget-alert-banner hidden";

        if (percentFormatted >= 100) {
            budgetProgressFill.classList.add("red");
            budgetBanner.className = "budget-alert-banner danger";
            bannerIcon.textContent = "🚨";
            bannerText.textContent = `Budget Exceeded! You have spent ${formatINR(totalSpent - monthlyBudget)} over your monthly limit of ${formatINR(monthlyBudget)}.`;
        } else if (percentFormatted >= 80) {
            budgetProgressFill.classList.add("yellow");
            budgetBanner.className = "budget-alert-banner warning";
            bannerIcon.textContent = "⚠️";
            bannerText.textContent = `Warning: You have reached ${percentFormatted}% of your monthly limit (${formatINR(monthlyBudget)}).`;
        } else {
            budgetProgressFill.classList.add("green");
        }
    }

    window.deleteExpense = async function(id) {
        if (!confirm("Delete this expense record?")) return;

        try {
            const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
            if (res.ok) {
                fetchExpenses();
            } else {
                alert("Could not delete record.");
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
                        "#00F2FE", "#7F56D9", "#FF007F", 
                        "#00F5A0", "#FFB547", "#FF4D4D"
                    ],
                    borderWidth: 0,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: "bottom",
                        labels: {
                            color: "#A0AEC0",
                            font: { family: "'Plus Jakarta Sans', sans-serif", size: 12 },
                            usePointStyle: true,
                            padding: 16
                        }
                    },
                    tooltip: {
                        backgroundColor: "rgba(10, 13, 24, 0.9)",
                        titleColor: "#FFF",
                        bodyColor: "#00F5A0",
                        borderColor: "rgba(255, 255, 255, 0.12)",
                        borderWidth: 1,
                        padding: 12,
                        callbacks: {
                            label: function(context) {
                                return ` ${context.label}: ${formatINR(context.raw)}`;
                            }
                        }
                    }
                },
                cutout: "72%"
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