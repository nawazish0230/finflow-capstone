import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { BorderRadius, Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useWindowDimensions } from 'react-native';

const PIE_HEIGHT = 200;
const LINE_CHART_HEIGHT = 200;

type TabKey = 'transactions' | 'insights';
type CategoryKey = 'All' | 'Food' | 'Travel' | 'Bills' | 'Income';

interface TransactionItem {
  id: string;
  name: string;
  date: string;
  amount: number;
  type: 'debit' | 'credit';
  category: CategoryKey;
}

const MOCK_TRANSACTIONS: TransactionItem[] = [
  { id: '1', name: 'Spotify Premium', date: '2024-05-24', amount: 14.99, type: 'debit', category: 'Bills' },
  { id: '2', name: 'Whole Foods Market', date: '2024-05-23', amount: 142.3, type: 'debit', category: 'Food' },
  { id: '3', name: 'Uber Ride', date: '2024-05-22', amount: 24.5, type: 'debit', category: 'Travel' },
  { id: '4', name: 'Salary Deposit', date: '2024-05-20', amount: 4500, type: 'credit', category: 'Income' },
  { id: '5', name: 'Starbucks Coffee', date: '2024-05-19', amount: 6.75, type: 'debit', category: 'Food' },
  { id: '6', name: 'Netflix', date: '2024-05-18', amount: 15.99, type: 'debit', category: 'Bills' },
];

const CATEGORIES: CategoryKey[] = ['All', 'Food', 'Travel', 'Bills', 'Income'];

const CATEGORY_ICON: Record<CategoryKey, string> = {
  Food: 'restaurant',
  Travel: 'directions-car',
  Bills: 'receipt-long',
  Income: 'work',
  All: 'list',
};

const PIE_DATA = [
  { name: 'Food', amount: 520, color: '#F59E0B', legendFontColor: '#64748B', legendFontSize: 12 },
  { name: 'Travel', amount: 380, color: '#3B82F6', legendFontColor: '#64748B', legendFontSize: 12 },
  { name: 'Shopping', amount: 290, color: '#8B5CF6', legendFontColor: '#64748B', legendFontSize: 12 },
  { name: 'Bills', amount: 220, color: '#10B981', legendFontColor: '#64748B', legendFontSize: 12 },
  { name: 'Entertainment', amount: 140, color: '#EC4899', legendFontColor: '#64748B', legendFontSize: 12 },
];

const LINE_DATA = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  datasets: [{ data: [2200, 2800, 3100, 2950, 3240, 3500] }],
};

const chartConfig = (primary: string, text: string, textSecondary: string) => ({
  backgroundColor: 'transparent',
  backgroundGradientFrom: 'transparent',
  backgroundGradientTo: 'transparent',
  decimalPlaces: 0,
  color: (opacity = 1) => primary,
  labelColor: () => textSecondary,
  style: { paddingRight: 0 },
  propsForLabels: { fontSize: 11 },
});

export default function DashboardScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = Math.min(screenWidth - Spacing.lg * 2 - 24, 340);
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const backgroundColor = useThemeColor({}, 'background');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const success = useThemeColor({}, 'success');
  const primary = colors.primary;

  const [activeTab, setActiveTab] = useState<TabKey>('transactions');
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTransactions = useMemo(() => {
    let list = MOCK_TRANSACTIONS;
    if (selectedCategory !== 'All') {
      list = list.filter((t) => t.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((t) => t.name.toLowerCase().includes(q));
    }
    return list;
  }, [selectedCategory, searchQuery]);

  const totalDebit = 3240;
  const totalCredit = 5350;

  const pieChartConfig = useMemo(
    () => chartConfig(primary, colors.text, textSecondary),
    [primary, colors.text, textSecondary]
  );

  const lineChartConfig = useMemo(
    () => chartConfig(primary, colors.text, textSecondary),
    [primary, colors.text, textSecondary]
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor }]}
      edges={["top"]}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
          <ThemedText type="subtitle">Financial Overview</ThemedText>
          <ThemedText style={[styles.subtitle, { color: textSecondary }]}>
            Your transactions & insights
          </ThemedText>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(80).duration(320)}
          style={styles.summaryRow}
        >
          <View style={[styles.summaryCardDebit, { backgroundColor: primary }]}>
            <ThemedText style={styles.summaryLabelWhite}>
              Total Debit
            </ThemedText>
            <View style={styles.summaryAmountRow}>
              <ThemedText style={styles.summaryAmountWhite}>$3,240</ThemedText>
              <MaterialIcons
                name="trending-down"
                size={20}
                color="rgba(255,255,255,0.9)"
              />
            </View>
          </View>
          <View
            style={[
              styles.summaryCardCredit,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <ThemedText style={[styles.summaryLabel, { color: textSecondary }]}>
              Total Credit
            </ThemedText>
            <View style={styles.summaryAmountRow}>
              <ThemedText
                style={[styles.summaryAmountGreen, { color: success }]}
              >
                $5,350
              </ThemedText>
              <MaterialIcons name="trending-up" size={20} color={success} />
            </View>
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(120).duration(320)}
          style={styles.segmentWrap}
        >
          <View
            style={[styles.segment, { backgroundColor: colors.border + "40" }]}
          >
            <Pressable
              onPress={() => setActiveTab("transactions")}
              style={[
                styles.segmentButton,
                activeTab === "transactions" && { backgroundColor: primary },
              ]}
            >
              <ThemedText
                style={[
                  styles.segmentButtonText,
                  {
                    color: activeTab === "transactions" ? "#fff" : colors.text,
                  },
                ]}
              >
                Transactions
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setActiveTab("insights")}
              style={[
                styles.segmentButton,
                activeTab === "insights" && { backgroundColor: primary },
              ]}
            >
              <ThemedText
                style={[
                  styles.segmentButtonText,
                  { color: activeTab === "insights" ? "#fff" : colors.text },
                ]}
              >
                Insights
              </ThemedText>
            </Pressable>
          </View>
        </Animated.View>

        {activeTab === "transactions" ? (
          <Animated.View
            key="transactions"
            entering={FadeIn.duration(280)}
            style={styles.tabContent}
          >
            <View
              style={[
                styles.searchRow,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <MaterialIcons name="search" size={20} color={textSecondary} />
              <TextInput
                placeholder="Search..."
                placeholderTextColor={textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={[styles.searchInput, { color: colors.text }]}
              />
              <Pressable hitSlop={12}>
                <MaterialIcons
                  name="filter-list"
                  size={22}
                  color={colors.text}
                />
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsWrap}
            >
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => setSelectedCategory(cat)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor:
                        selectedCategory === cat ? primary : colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.chipText,
                      {
                        color: selectedCategory === cat ? "#fff" : colors.text,
                      },
                    ]}
                  >
                    {cat}
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.list}>
              {filteredTransactions.map((t, i) => (
                <Animated.View
                  key={t.id}
                  entering={FadeInDown.delay(i * 40).duration(260)}
                  style={[
                    styles.transactionRow,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.txIconWrap,
                      { backgroundColor: colors.border + "50" },
                    ]}
                  >
                    <MaterialIcons
                      name={
                        (CATEGORY_ICON[t.category] ??
                          "receipt") as React.ComponentProps<
                          typeof MaterialIcons
                        >["name"]
                      }
                      size={22}
                      color={t.type === "credit" ? success : colors.text}
                    />
                  </View>
                  <View style={styles.txBody}>
                    <ThemedText style={styles.txName}>{t.name}</ThemedText>
                    <ThemedText
                      style={[styles.txDate, { color: textSecondary }]}
                    >
                      {t.date}
                    </ThemedText>
                  </View>
                  <ThemedText
                    style={[
                      styles.txAmount,
                      { color: t.type === "credit" ? success : colors.text },
                    ]}
                  >
                    {t.type === "credit" ? "+" : "-"}${t.amount.toFixed(2)}
                  </ThemedText>
                </Animated.View>
              ))}
            </View>
          </Animated.View>
        ) : (
          <Animated.View
            key="insights"
            entering={FadeIn.duration(280)}
            style={styles.tabContent}
          >
            <View style={styles.insightCardsRow}>
              <View
                style={[
                  styles.insightCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View
                  style={[
                    styles.insightIconWrap,
                    { backgroundColor: "#F59E0B22" },
                  ]}
                >
                  <MaterialIcons name="show-chart" size={24} color="#F59E0B" />
                </View>
                <ThemedText
                  style={[styles.insightLabel, { color: textSecondary }]}
                >
                  Highest Spending Month
                </ThemedText>
                <ThemedText style={styles.insightValue}>June</ThemedText>
                <ThemedText
                  style={[styles.insightDetail, { color: textSecondary }]}
                >
                  $3,500 spent
                </ThemedText>
              </View>
              <View
                style={[
                  styles.insightCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View
                  style={[
                    styles.insightIconWrap,
                    { backgroundColor: primary + "22" },
                  ]}
                >
                  <MaterialIcons name="pie-chart" size={24} color={primary} />
                </View>
                <ThemedText
                  style={[styles.insightLabel, { color: textSecondary }]}
                >
                  Top Category
                </ThemedText>
                <ThemedText style={styles.insightValue}>Food</ThemedText>
                <ThemedText
                  style={[styles.insightDetail, { color: textSecondary }]}
                >
                  25% of total spend
                </ThemedText>
              </View>
            </View>

            <View
              style={[
                styles.chartCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <ThemedText style={styles.chartTitle}>
                Spending by Category
              </ThemedText>
              <View style={[styles.pieWrap, { height: PIE_HEIGHT }]}>
                <View style={[styles.pieChartContainer, { width: chartWidth }]}>
                  <PieChart
                    data={PIE_DATA}
                    width={chartWidth}
                    height={PIE_HEIGHT}
                    chartConfig={pieChartConfig}
                    accessor="amount"
                    backgroundColor="transparent"
                    paddingLeft={String(chartWidth / 4)}
                    hasLegend={false}
                    style={styles.pieChartSvg}
                  />
                </View>
                <View
                  style={[
                    styles.pieCenter,
                    { top: PIE_HEIGHT / 2, marginTop: -28 },
                  ]}
                >
                  <ThemedText type="subtitle">$1,550</ThemedText>
                  <ThemedText
                    style={[styles.pieCenterLabel, { color: textSecondary }]}
                  >
                    Total
                  </ThemedText>
                </View>
              </View>
              <View style={styles.legendRow}>
                {PIE_DATA.map((d) => (
                  <ThemedText
                    key={d.name}
                    style={[styles.legendItem, { color: textSecondary }]}
                  >
                    {d.name}
                  </ThemedText>
                ))}
              </View>
            </View>

            <View
              style={[
                styles.chartCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <ThemedText style={styles.chartTitle}>
                Monthly expense trend
              </ThemedText>
              <View style={styles.lineChartWrap}>
                <LineChart
                  data={LINE_DATA}
                  width={chartWidth}
                  height={LINE_CHART_HEIGHT}
                  chartConfig={lineChartConfig}
                  bezier
                  withDots
                  withInnerLines
                  withOuterLines={false}
                  fromZero
                  style={styles.lineChart}
                />
              </View>
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  header: { marginBottom: Spacing.lg },
  subtitle: { fontSize: 15, marginTop: Spacing.xs },
  summaryRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.lg },
  summaryCardDebit: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  summaryLabelWhite: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginBottom: 4 },
  summaryAmountWhite: { fontSize: 22, fontWeight: '800', color: '#fff' },
  summaryCardCredit: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
  },
  summaryLabel: { fontSize: 13, marginBottom: 4 },
  summaryAmountGreen: { fontSize: 22, fontWeight: '800' },
  summaryAmountRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  segmentWrap: { marginBottom: Spacing.lg },
  segment: {
    flexDirection: 'row',
    borderRadius: BorderRadius.full,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
  },
  segmentButtonText: { fontSize: 15, fontWeight: '600' },
  tabContent: { marginTop: Spacing.xs },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    marginBottom: Spacing.md,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 0 },
  chipsWrap: { flexDirection: 'row', gap: 8, marginBottom: Spacing.lg },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  chipText: { fontSize: 14, fontWeight: '500' },
  list: { gap: Spacing.sm },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  txIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  txBody: { flex: 1, minWidth: 0 },
  txName: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  txDate: { fontSize: 12 },
  txAmount: { fontSize: 16, fontWeight: '700' },
  insightCardsRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.lg },
  insightCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  insightIconWrap: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  insightLabel: { fontSize: 12, marginBottom: 4 },
  insightValue: { fontSize: 18, fontWeight: '700', marginBottom: 2 },
  insightDetail: { fontSize: 12 },
  chartCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  chartTitle: { fontSize: 16, fontWeight: '700', marginBottom: Spacing.md },
  pieWrap: { position: 'relative', alignItems: 'center', marginBottom: Spacing.sm },
  pieChartContainer: { alignSelf: 'center' },
  pieChartSvg: {},
  pieCenter: {
    position: 'absolute',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieCenterLabel: { fontSize: 12 },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.sm },
  legendItem: { fontSize: 12 },
  lineChartWrap: { alignItems: 'center' },
  lineChart: { marginVertical: 8, borderRadius: BorderRadius.md },
});
