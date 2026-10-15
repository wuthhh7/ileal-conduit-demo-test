'use client';

import Link from 'next/link';
import {
  CartesianGrid,
  BarChart,
  Bar,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  CircleAlert,
  Clapperboard,
  Clock3,
  Eye,
  History,
  PlayCircle,
  ShieldCheck,
  Tickets,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { DashboardLogin } from './dashboard-login';
import { DashboardShell } from './dashboard-shell';
import { PatientAvatar } from './patient-avatar';
import { thaiDate, urgencyLabel } from './types';
import { useDashboardData } from './use-dashboard-data';
import styles from './dashboard.module.css';

type ChartRange = 'daily' | 'monthly';
type ChartDatum = {
  key: string;
  label: string;
  primary: number;
  secondary: number;
  tertiary: number;
};
type ChartSeriesKey = keyof Pick<
  ChartDatum,
  'primary' | 'secondary' | 'tertiary'
>;
type ChartSeries = {
  dataKey: ChartSeriesKey;
  label: string;
  color: string;
};

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
const RANGE_OPTIONS: { value: ChartRange; label: string }[] = [
  { value: 'daily', label: 'รายวัน' },
  { value: 'monthly', label: 'รายเดือน' },
];
const RANGE_TITLES: Record<ChartRange, string> = {
  daily: '7 วันที่ล่าสุด',
  monthly: '6 เดือนล่าสุด',
};
const ISSUE_CHART_SERIES: ChartSeries[] = [
  { dataKey: 'primary', label: 'ปกติ', color: '#55a985' },
  { dataKey: 'secondary', label: 'เฝ้าระวัง', color: '#d99a28' },
  { dataKey: 'tertiary', label: 'เร่งด่วน', color: '#d55757' },
];
const CONTENT_CHART_SERIES: ChartSeries[] = [
  { dataKey: 'primary', label: 'เปิดหน้าคลัง', color: 'var(--chart-primary)' },
  { dataKey: 'secondary', label: 'เล่นวิดีโอ', color: 'var(--chart-secondary)' },
];

function bangkokDate(value: string | number | Date) {
  return new Date(new Date(value).getTime() + BANGKOK_OFFSET_MS);
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function bucketKey(value: string, range: ChartRange) {
  const date = bangkokDate(value);
  if (range === 'monthly') return date.toISOString().slice(0, 7);
  return dateKey(date);
}

function createTimeBuckets(range: ChartRange): ChartDatum[] {
  const today = bangkokDate(Date.now());
  today.setUTCHours(0, 0, 0, 0);
  const count = range === 'daily' ? 7 : 6;
  const formatter = new Intl.DateTimeFormat('th-TH', {
    ...(range === 'daily'
      ? { day: 'numeric' as const, month: 'short' as const }
      : { month: 'short' as const }),
    timeZone: 'UTC',
  });

  if (range === 'monthly') {
    today.setUTCDate(1);
  }

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(today);
    const distance = count - 1 - index;
    if (range === 'monthly') date.setUTCMonth(date.getUTCMonth() - distance);
    else date.setUTCDate(date.getUTCDate() - distance);
    return {
      key: range === 'monthly' ? date.toISOString().slice(0, 7) : dateKey(date),
      label: formatter.format(date),
      primary: 0,
      secondary: 0,
      tertiary: 0,
    };
  });
}

function aggregateSeries(
  range: ChartRange,
  primaryEvents: string[],
  secondaryEvents: string[],
  tertiaryEvents: string[] = [],
) {
  const buckets = createTimeBuckets(range);
  const byKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));
  for (const event of primaryEvents) {
    const bucket = byKey.get(bucketKey(event, range));
    if (bucket) bucket.primary += 1;
  }
  for (const event of secondaryEvents) {
    const bucket = byKey.get(bucketKey(event, range));
    if (bucket) bucket.secondary += 1;
  }
  for (const event of tertiaryEvents) {
    const bucket = byKey.get(bucketKey(event, range));
    if (bucket) bucket.tertiary += 1;
  }
  return buckets;
}

export function DashboardAnalytics() {
  const { data, needsLogin, error, loading, load } = useDashboardData();
  const [issueChartRange, setIssueChartRange] = useState<ChartRange>('daily');
  const [contentChartRange, setContentChartRange] =
    useState<ChartRange>('daily');
  if (needsLogin) return <DashboardLogin onSuccess={load} />;

  const patients = data?.patients || [];
  const issues = data?.issues || [];
  const answered = issues.filter((issue) => issue.status === 'answered').length;
  const unanswered = issues.filter(
    (issue) => issue.status === 'unanswered',
  ).length;
  const urgent = issues.filter(
    (issue) => issue.status === 'unanswered' && issue.urgency === 'red',
  ).length;
  const reportingPatients = new Set(issues.map((issue) => issue.patientId))
    .size;
  const attention = issues
    .filter((issue) => issue.status === 'unanswered')
    .sort((a, b) => {
      const weight = { red: 3, yellow: 2, green: 1 };
      const score = (issue: typeof a) => weight[issue.urgency];
      return (
        score(b) - score(a) ||
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    })
    .slice(0, 4);
  const latestPatients = patients
    .map((patient) => {
      const patientIssues = issues.filter(
        (issue) => issue.patientId === patient.id,
      );
      const latestIssueAt = patientIssues.reduce<string | null>(
        (latest, issue) =>
          !latest || new Date(issue.createdAt) > new Date(latest)
            ? issue.createdAt
            : latest,
        null,
      );
      return { ...patient, issueCount: patientIssues.length, latestIssueAt };
    })
    .filter((patient) => patient.issueCount > 0)
    .sort(
      (a, b) =>
        new Date(b.latestIssueAt || 0).getTime() -
        new Date(a.latestIssueAt || 0).getTime(),
    )
    .slice(0, 10);

  const greenCount = issues.filter((issue) => issue.urgency === 'green').length;
  const yellowCount = issues.filter(
    (issue) => issue.urgency === 'yellow',
  ).length;
  const redCount = issues.filter((issue) => issue.urgency === 'red').length;
  const greenPercent = issues.length ? (greenCount / issues.length) * 100 : 0;
  const yellowPercent = issues.length ? (yellowCount / issues.length) * 100 : 0;
  const donut = issues.length
    ? `conic-gradient(#55a985 0 ${greenPercent}%, #d99a28 ${greenPercent}% ${greenPercent + yellowPercent}%, #d55757 ${greenPercent + yellowPercent}% 100%)`
    : '#e8eef0';
  const contentAnalytics = data?.contentAnalytics || {
    pageViews: 0,
    pageViewsToday: 0,
    pageViews7Days: 0,
    videoPlays: 0,
    videoPlays7Days: 0,
    daily: [],
    events: { pageViews: [], videoPlays: [] },
    topVideos: [],
  };
  const issueSeries = aggregateSeries(
    issueChartRange,
    issues
      .filter((issue) => issue.urgency === 'green')
      .map((issue) => issue.createdAt),
    issues
      .filter((issue) => issue.urgency === 'yellow')
      .map((issue) => issue.createdAt),
    issues
      .filter((issue) => issue.urgency === 'red')
      .map((issue) => issue.createdAt),
  );
  const contentSeries = aggregateSeries(
    contentChartRange,
    contentAnalytics.events.pageViews,
    contentAnalytics.events.videoPlays,
  );
  const issueRangeTotals = issueSeries.reduce(
    (totals, point) => ({
      primary: totals.primary + point.primary,
      secondary: totals.secondary + point.secondary,
      tertiary: totals.tertiary + point.tertiary,
    }),
    { primary: 0, secondary: 0, tertiary: 0 },
  );
  const selectedPageViews = contentSeries.reduce(
    (sum, point) => sum + point.primary,
    0,
  );
  const selectedVideoPlays = contentSeries.reduce(
    (sum, point) => sum + point.secondary,
    0,
  );
  const topVideoMax = Math.max(
    ...contentAnalytics.topVideos.map((video) => video.views),
    1,
  );

  return (
    <DashboardShell
      title="แดชบอร์ด"
      description="ภาพรวมปัญหาที่ผู้ป่วยแจ้งและสถานะการตอบกลับของพยาบาล"
      onRefresh={load}
    >
      {error && <div className={styles.error}>{error}</div>}
      <section className={styles.dashboardKpis}>
        <Kpi
          icon={<Tickets />}
          label="ปัญหาทั้งหมด"
          value={issues.length}
          note={`จากผู้ป่วย ${reportingPatients} ราย`}
        />
        <Kpi
          icon={<CheckCircle2 />}
          label="ตอบกลับแล้ว"
          value={answered}
          note="ส่งคำตอบเข้า LINE แล้ว"
        />
        <Kpi
          icon={<Clock3 />}
          label="ยังไม่ตอบกลับ"
          value={unanswered}
          note="รอพยาบาลตอบกลับ"
          tone="warning"
        />
        <Kpi
          icon={<CircleAlert />}
          label="เรื่องเร่งด่วน"
          value={urgent}
          note="ยังรอคำตอบ"
          tone="danger"
        />
      </section>

      {loading && !data ? (
        <div className={styles.loadingRows}>
          <i />
          <i />
          <i />
        </div>
      ) : (
        <>
          <section className={styles.dashboardMainGrid}>
            <article className={`${styles.dashboardCard} ${styles.trendCard}`}>
              <header>
                <div>
                  <h2>แนวโน้มปัญหาที่แจ้งเข้ามา</h2>
                  <small>{RANGE_TITLES[issueChartRange]}</small>
                </div>
                <ChartRangeControl
                  value={issueChartRange}
                  onChange={setIssueChartRange}
                  label="เลือกช่วงเวลาของกราฟปัญหา"
                />
              </header>
              <ChartTotals
                series={ISSUE_CHART_SERIES}
                totals={issueRangeTotals}
                unit="เรื่อง"
              />
              <ComparisonBarChart
                data={issueSeries}
                series={ISSUE_CHART_SERIES}
                ariaLabel={`กราฟแท่งจำนวนปัญหาตามระดับความสำคัญ ${RANGE_TITLES[issueChartRange]}`}
              />
            </article>

            <article
              className={`${styles.dashboardCard} ${styles.attentionCard}`}
            >
              <header>
                <div>
                  <small>เรียงตามความสำคัญ</small>
                  <h2>เรื่องที่รอคำตอบ</h2>
                </div>
                <Link href="/dashboard/issues/unanswered">
                  ดูทั้งหมด
                  <ArrowRight />
                </Link>
              </header>
              <div className={styles.attentionList}>
                {attention.length ? (
                  attention.map((issue) => (
                    <Link
                      href={`/dashboard/issues/unanswered#issue-${issue.id}`}
                      key={issue.id}
                    >
                      <PatientAvatar
                        name={issue.displayName}
                        avatarUrl={issue.avatarUrl}
                        className={styles.miniAvatar}
                      />
                      <div>
                        <b>{issue.subject}</b>
                        <small>{issue.displayName}</small>
                      </div>
                      <span
                        className={`${styles.tableBadge} ${styles[issue.urgency]}`}
                      >
                        {urgencyLabel[issue.urgency]}
                      </span>
                    </Link>
                  ))
                ) : (
                  <div className={styles.compactEmpty}>
                    <ShieldCheck />
                    ไม่มีเรื่องที่รอคำตอบ
                  </div>
                )}
              </div>
            </article>

            <article className={`${styles.dashboardCard} ${styles.statusCard}`}>
              <header>
                <div>
                  <small>ปัญหาทั้งหมด</small>
                  <h2>ระดับความเร่งด่วน</h2>
                </div>
              </header>
              <div className={styles.donutLayout}>
                <div
                  className={styles.donutChart}
                  style={{ background: donut }}
                >
                  <span>
                    <b>{issues.length}</b>
                    <small>เรื่อง</small>
                  </span>
                </div>
                <div className={styles.donutLegend}>
                  <span>
                    <i className={styles.legendGreen} />
                    ปกติ <b>{greenCount}</b>
                  </span>
                  <span>
                    <i className={styles.legendYellow} />
                    เฝ้าระวัง <b>{yellowCount}</b>
                  </span>
                  <span>
                    <i className={styles.legendRed} />
                    เร่งด่วน <b>{redCount}</b>
                  </span>
                </div>
              </div>
            </article>
          </section>

          <section
            className={`${styles.dashboardCard} ${styles.contentInsights}`}
          >
            <header>
              <div>
                <h2>การใช้งานเนื้อหาผู้ป่วย</h2>
                <p>ติดตามการเปิดคลังวิดีโอและการกดเล่นคลิปจาก LINE</p>
              </div>
              <Link href="/dashboard/videos">
                จัดการคลิป
                <ArrowRight />
              </Link>
            </header>
            <div className={styles.contentInsightsBody}>
              <div className={styles.contentPulse}>
                <div className={styles.contentMetricStrip}>
                  <div>
                    <span>
                      <BookOpen />
                      เปิดหน้าในช่วงนี้
                    </span>
                    <AnimatedNumber value={selectedPageViews} />
                    <small>ครั้ง</small>
                  </div>
                  <div>
                    <span>
                      <PlayCircle />
                      เล่นวิดีโอในช่วงนี้
                    </span>
                    <AnimatedNumber value={selectedVideoPlays} />
                    <small>ครั้ง</small>
                  </div>
                  <div>
                    <span>
                      <PlayCircle />
                      ยอดเล่นทั้งหมด
                    </span>
                    <AnimatedNumber value={contentAnalytics.videoPlays} />
                    <small>ครั้ง</small>
                  </div>
                </div>
                <div className={styles.contentChartHeader}>
                  <div>
                    <b>กิจกรรม {RANGE_TITLES[contentChartRange]}</b>
                    <small>เปรียบเทียบการเปิดหน้าคลังกับการเล่นวิดีโอ</small>
                  </div>
                  <ChartRangeControl
                    value={contentChartRange}
                    onChange={setContentChartRange}
                    label="เลือกช่วงเวลาของกราฟเนื้อหา"
                  />
                </div>
                <ChartTotals
                  series={CONTENT_CHART_SERIES}
                  totals={{
                    primary: selectedPageViews,
                    secondary: selectedVideoPlays,
                    tertiary: 0,
                  }}
                  unit="ครั้ง"
                />
                <ComparisonBarChart
                  data={contentSeries}
                  series={CONTENT_CHART_SERIES}
                  ariaLabel={`กราฟแท่งการเปิดหน้าคลังเนื้อหาและการเล่นวิดีโอ ${RANGE_TITLES[contentChartRange]}`}
                  tone="content"
                  compact
                />
              </div>

              <aside className={styles.popularVideos}>
                <header>
                  <div>
                    <h3>คลิปที่ได้รับความสนใจ</h3>
                    <p>เรียงตามยอดเล่นสะสม</p>
                  </div>
                  <span>{contentAnalytics.topVideos.length} คลิป</span>
                </header>
                {contentAnalytics.topVideos.length ? (
                  <div className={styles.popularVideoList}>
                    {contentAnalytics.topVideos.map((video, index) => (
                      <article key={video.id}>
                        <span className={styles.videoRank}>{index + 1}</span>
                        <div
                          className={styles.popularVideoThumb}
                          style={
                            video.posterUrl
                              ? {
                                  backgroundImage: `url("${video.posterUrl.replaceAll('"', '%22')}")`,
                                }
                              : undefined
                          }
                        >
                          {!video.posterUrl && <Clapperboard />}
                        </div>
                        <div className={styles.popularVideoCopy}>
                          <div>
                            <b>{video.title}</b>
                            <small>{video.durationLabel || 'วิดีโอ'}</small>
                          </div>
                          <div className={styles.videoReach}>
                            <i>
                              <span
                                style={{
                                  width: `${Math.max(5, (video.views / topVideoMax) * 100)}%`,
                                }}
                              />
                            </i>
                            <strong>
                              <Eye />
                              {video.views} ครั้ง
                            </strong>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className={styles.contentEmpty}>
                    <Clapperboard />
                    <span>ยังไม่มีคลิปในคลัง</span>
                  </div>
                )}
              </aside>
            </div>
            <footer className={styles.contentTrackingNote}>
              สถิติรายวันเริ่มเก็บตั้งแต่เปิดใช้ฟีเจอร์นี้ · ยอดเล่นทั้งหมดอ้างอิงจากคลิปที่มีอยู่ในระบบ
            </footer>
          </section>

          <section
            className={`${styles.dashboardCard} ${styles.overviewTableCard}`}
          >
            <header>
              <div>
                <small>10 คนล่าสุดที่แจ้งปัญหา</small>
                <h2>ภาพรวมผู้ป่วย</h2>
              </div>
              <Link href="/dashboard/patients">
                ดูผู้ป่วยทั้งหมด
                <ArrowRight />
              </Link>
            </header>
            {latestPatients.length ? (
              <div className={styles.dashboardTableWrap}>
                <table className={styles.dashboardTable}>
                  <caption className={styles.srOnly}>
                    ผู้ป่วย 10 คนล่าสุดที่แจ้งปัญหา
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">ชื่อ</th>
                      <th scope="col">อายุ</th>
                      <th scope="col">วันที่แจ้งปัญหาล่าสุด</th>
                      <th scope="col">จำนวนครั้งการแจ้งปัญหา</th>
                      <th scope="col">ประวัติการแจ้งปัญหา</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latestPatients.map((patient) => (
                      <tr key={patient.id}>
                        <th
                          scope="row"
                          aria-label={`ผู้ป่วย ${patient.displayName}`}
                        >
                          <div className={styles.tablePatient}>
                            <PatientAvatar
                              name={patient.displayName}
                              avatarUrl={patient.avatarUrl}
                              className={styles.tableAvatar}
                            />
                            <div>
                              <b>{patient.displayName}</b>
                            </div>
                          </div>
                        </th>
                        <td>{patient.age ? `${patient.age} ปี` : 'ไม่ระบุ'}</td>
                        <td>{thaiDate(patient.latestIssueAt)}</td>
                        <td>
                          <span className={styles.issueCount}>
                            {patient.issueCount} ครั้ง
                          </span>
                        </td>
                        <td>
                          <Link
                            href={`/dashboard/patients/${patient.id}`}
                            className={styles.historyAction}
                            aria-label={`ดูประวัติการแจ้งปัญหาของ ${patient.displayName}`}
                          >
                            <History />
                            ดูประวัติ
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={styles.compactEmpty}>ยังไม่มีผู้ป่วยแจ้งปัญหา</div>
            )}
          </section>
        </>
      )}
    </DashboardShell>
  );
}

function ChartRangeControl({
  value,
  onChange,
  label,
}: {
  value: ChartRange;
  onChange: (value: ChartRange) => void;
  label: string;
}) {
  return (
    <fieldset className={styles.chartRangeControl}>
      <legend className={styles.srOnly}>{label}</legend>
      {RANGE_OPTIONS.map((option) => (
        <button
          type="button"
          key={option.value}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </fieldset>
  );
}

function ChartTotals({
  series,
  totals,
  unit,
}: {
  series: ChartSeries[];
  totals: Record<ChartSeriesKey, number>;
  unit: string;
}) {
  return (
    <div className={styles.chartTotals} aria-label="สรุปข้อมูลในช่วงที่เลือก">
      {series.map((item) => (
        <div key={item.dataKey}>
          <i style={{ background: item.color }} />
          <span>{item.label}</span>
          <b>{totals[item.dataKey].toLocaleString('th-TH')}</b>
          <small>{unit}</small>
        </div>
      ))}
    </div>
  );
}

function ComparisonBarChart({
  data,
  series,
  ariaLabel,
  tone = 'issues',
  compact = false,
}: {
  data: ChartDatum[];
  series: ChartSeries[];
  ariaLabel: string;
  tone?: 'issues' | 'content';
  compact?: boolean;
}) {
  const maxValue = Math.max(
    ...data.flatMap((point) => [
      point.primary,
      point.secondary,
      point.tertiary,
    ]),
    1,
  );

  return (
    <figure
      className={`${styles.lineChart} ${compact ? styles.lineChartCompact : ''} ${tone === 'content' ? styles.lineChartContent : ''}`}
      aria-label={ariaLabel}
    >
      <div className={styles.rechartsChart}>
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={0}
          initialDimension={{ width: 700, height: compact ? 225 : 258 }}
        >
          <BarChart
            data={data}
            margin={{ top: 28, right: 8, left: -12, bottom: 4 }}
            barGap={3}
            barCategoryGap="22%"
            accessibilityLayer
          >
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tickMargin={12}
              minTickGap={8}
              tick={{
                fill: 'var(--chart-muted)',
                fontSize: 10,
                fontWeight: 650,
              }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              width={34}
              allowDecimals={false}
              domain={[0, Math.max(2, Math.ceil(maxValue * 1.2))]}
              tick={{
                fill: 'var(--chart-muted)',
                fontSize: 10,
                fontWeight: 650,
              }}
            />
            <Tooltip
              cursor={{ fill: 'var(--chart-grid)', opacity: 0.35 }}
              content={
                <ComparisonTooltip
                  series={series}
                  unit={tone === 'issues' ? 'เรื่อง' : 'ครั้ง'}
                />
              }
            />
            {series.map((item) => (
              <Bar
                key={item.dataKey}
                dataKey={item.dataKey}
                name={item.label}
                fill={item.color}
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
                isAnimationActive={false}
              >
                <LabelList
                  position="top"
                  offset={7}
                  fill="var(--chart-muted)"
                  fontSize={11}
                  fontWeight={700}
                  formatter={(value) =>
                    Number(value) > 0 ? String(value) : ''
                  }
                />
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className={styles.chartReadingNote}>
        {tone === 'issues' ? 'จำนวนปัญหา (เรื่อง)' : 'จำนวนกิจกรรม (ครั้ง)'} ·
        แต่ละสีแสดงคนละประเภท · ไม่มีแท่ง = 0
      </figcaption>
    </figure>
  );
}

type ComparisonTooltipEntry = {
  dataKey?: string | number;
  value?: string | number;
  color?: string;
};

function ComparisonTooltip({
  active,
  payload,
  label,
  series,
  unit,
}: {
  active?: boolean;
  payload?: readonly ComparisonTooltipEntry[];
  label?: string | number;
  series: ChartSeries[];
  unit: string;
}) {
  if (!active || !payload?.length) return null;
  const uniqueEntries = payload.filter(
    (entry, index, entries) =>
      entries.findIndex((candidate) => candidate.dataKey === entry.dataKey) ===
      index,
  );
  return (
    <div className={styles.chartTooltip}>
      <b>{label}</b>
      {uniqueEntries.map((entry) => {
        const item = series.find(
          (candidate) => candidate.dataKey === entry.dataKey,
        );
        if (!item) return null;
        return (
          <div key={String(entry.dataKey)}>
            <span>
              <i
                style={{
                  background: item.color,
                }}
              />
              {item.label}
            </span>
            <strong>
              {Number(entry.value || 0).toLocaleString('th-TH')} {unit}
            </strong>
          </div>
        );
      })}
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  note,
  tone = '',
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  note: string;
  tone?: 'warning' | 'danger' | '';
}) {
  return (
    <article className={tone ? styles[`dashboardKpi_${tone}`] : ''}>
      <div>
        <span>{label}</span>
        <AnimatedNumber value={value} />
        <small>{note}</small>
      </div>
      <i>{icon}</i>
    </article>
  );
}

function AnimatedNumber({ value }: { value: number }) {
  const [displayed, setDisplayed] = useState(value);

  useEffect(() => {
    const startedAt = performance.now();
    const duration = 720;
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <b>{displayed}</b>;
}
