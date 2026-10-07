from flask import Flask, render_template, request, jsonify
from database import init_db, add_expense_db, get_all_expenses_db, delete_expense_db

app = Flask(__name__)

# Initialize database tables on app startup
init_db()

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/api/expenses", methods=["GET"])
def get_expenses():
    expenses = get_all_expenses_db()
    return jsonify(expenses)

@app.route("/api/expenses", methods=["POST"])
def add_expense():
    data = request.get_json()
    if not data or not all(k in data for k in ("title", "amount", "category", "date")):
        return jsonify({"error": "Missing required fields"}), 400

    try:
        amount = float(data["amount"])
    except ValueError:
        return jsonify({"error": "Amount must be a number"}), 400

    new_id = add_expense_db(data["title"], amount, data["category"], data["date"])
    return jsonify({
        "id": new_id,
        "title": data["title"],
        "amount": amount,
        "category": data["category"],
        "date": data["date"]
    }), 201

@app.route("/api/expenses/<int:expense_id>", methods=["DELETE"])
def delete_expense(expense_id):
    success = delete_expense_db(expense_id)
    if success:
        return jsonify({"message": "Expense deleted successfully"}), 200
    return jsonify({"error": "Expense not found"}), 404

if __name__ == "__main__":
    app.run(debug=True, port=5000)