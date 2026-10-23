import { gql } from "@apollo/client";

export const GET_DASHBOARD_DATA = gql`
  query GET_DASHBOARD_DATA($userId: ID!) {
    getUserDashboard(userId: $userId) {
      totalBalance
      monthlyIncome
      monthlyExpenses
      monthlyTrend { month income expenses }
      expensesByCategory { categoryId categoryName amount }
      categories { id name type }
      budgets {
        id
        amount
        period
        startDate
        endDate
        category { id name }
      }
      savingsGoals {
        id
        name
        targetAmount
        currentAmount
        deadline
      }
      recentTransactions {
        id
        date
        category { name }
        description
        amount
        type
        status
      }
    }
  }
`;

export const GET_TRANSACTIONS = gql`
  query GET_TRANSACTIONS($userId: ID!, $categoryId: ID, $month: String) {
    getTransactions(userId: $userId, categoryId: $categoryId, month: $month) {
      id
      date
      amount
      type
      description
      category { id name }
    }
  }
`;

export const ADD_BUDGET = gql`
  mutation ADD_BUDGET(
    $categoryId: ID
    $amount: Float!
    $period: String!
    $startDate: DateTime
    $endDate: DateTime
  ) {
    addBudget(
      categoryId: $categoryId
      amount: $amount
      period: $period
      startDate: $startDate
      endDate: $endDate
    ) {
      id
    }
  }
`;

export const ADD_CATEGORY = gql`
  mutation ADD_CATEGORY($name: String!, $type: String!) {
    addCategory(name: $name, type: $type) {
      id
      name
      type
    }
  }
`;

export const ADD_SAVINGS_GOAL = gql`
  mutation ADD_SAVINGS_GOAL($name: String!, $targetAmount: Float!, $deadline: DateTime) {
    addSavingsGoal(name: $name, targetAmount: $targetAmount, deadline: $deadline) {
      id
    }
  }
`;

export const UPDATE_SAVINGS_GOAL = gql`
  mutation UPDATE_SAVINGS_GOAL($id: ID!, $currentAmount: Float!) {
    updateSavingsGoal(id: $id, currentAmount: $currentAmount) {
      id
      currentAmount
    }
  }
`;