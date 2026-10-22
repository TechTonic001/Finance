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