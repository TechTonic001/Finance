import { gql } from "@apollo/client";

export const GET_CATEGORIES = gql`
  query GET_CATEGORIES($userId: ID!) {
    getCategories(userId: $userId) {
      id
      name
      type
    }
  }
`;

export const GET_DASHBOARD_DATA = gql`
  query GET_DASHBOARD_DATA($userId: ID!) {
    getUserDashboard(userId: $userId) {
      totalBalance
      monthlyIncome
      monthlyExpenses
      monthlyTrend { month income expenses }
      expensesByCategory { categoryId categoryName amount }
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
  query GET_TRANSACTIONS(
    $userId: ID!
    $categoryId: ID
    $type: String
    $month: String
    $year: Int
    $search: String
  ) {
    getTransactions(
      userId: $userId
      categoryId: $categoryId
      type: $type
      month: $month
      year: $year
      search: $search
    ) {
      id
      date
      amount
      type
      description
      category { id name }
      account { id name }
      accountId
      recurringFrequency
      nextOccurrence
    }
  }
`;

export const GET_ACCOUNTS = gql`
  query GET_ACCOUNTS($userId: ID!) {
    getAccounts(userId: $userId) {
      id
      name
      type
      balance
    }
  }
`;

export const GET_BUDGET_STATUSES = gql`
  query GET_BUDGET_STATUSES($userId: ID!, $month: String!) {
    getBudgetStatuses(userId: $userId, month: $month) {
      budgetId
      categoryId
      categoryName
      amount
      spent
      percentage
      threshold
    }
  }
`;

export const GET_MONTHLY_SPENDING_COMPARISON = gql`
  query GET_MONTHLY_SPENDING_COMPARISON($userId: ID!, $month: String) {
    getMonthlySpendingComparison(userId: $userId, month: $month) {
      currentMonth
      previousMonth
      currentSpending
      previousSpending
      percentageChange
    }
  }
`;

export const CREATE_ACCOUNT = gql`
  mutation CREATE_ACCOUNT($name: String!, $type: String!) {
    createAccount(name: $name, type: $type) {
      id
      name
      type
      balance
    }
  }
`;

export const TRANSFER_FUNDS = gql`
  mutation TRANSFER_FUNDS($fromAccountId: ID!, $toAccountId: ID!, $amount: Float!) {
    transferFunds(fromAccountId: $fromAccountId, toAccountId: $toAccountId, amount: $amount) {
      id
      amount
      date
    }
  }
`;

export const UPDATE_TRANSACTION = gql`
  mutation UPDATE_TRANSACTION(
    $id: ID!
    $categoryId: ID
    $accountId: ID
    $amount: Float
    $type: String
    $description: String
    $date: DateTime
    $recurringFrequency: String
  ) {
    updateTransaction(
      id: $id
      categoryId: $categoryId
      accountId: $accountId
      amount: $amount
      type: $type
      description: $description
      date: $date
      recurringFrequency: $recurringFrequency
    ) {
      id
      amount
      type
      date
      description
      category { id name }
      account { id name }
      accountId
      recurringFrequency
      nextOccurrence
    }
  }
`;

export const DELETE_TRANSACTION = gql`
  mutation DELETE_TRANSACTION($id: ID!) {
    deleteTransaction(id: $id)
  }
`;

export const PROCESS_DUE_RECURRING_TRANSACTIONS = gql`
  mutation PROCESS_DUE_RECURRING_TRANSACTIONS {
    processDueRecurringTransactions
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