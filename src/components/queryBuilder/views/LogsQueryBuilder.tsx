import React, { useMemo, useState } from 'react';
import { ColumnsEditor } from '../ColumnsEditor';
import { Filter, OrderBy, QueryBuilderOptions, SelectedColumn, ColumnHint } from 'types/queryBuilder';
import { ColumnSelect } from '../ColumnSelect';
import { OtelVersionSelect } from '../OtelVersionSelect';
import { OrderByEditor, getOrderByOptions } from '../OrderByEditor';
import { LimitEditor } from '../LimitEditor';
import { FiltersEditor } from '../FilterEditor';
import allLabels from 'labels';
import { getColumnByHint } from 'data/sqlGenerator';
import { columnFilterDateTime, columnFilterString } from 'data/columnFilters';
import { Datasource } from 'data/CHDatasource';
import { useBuilderOptionChanges } from 'hooks/useBuilderOptionChanges';
import { Alert, VerticalGroup } from '@grafana/ui';
import useColumns from 'hooks/useColumns';
import { BuilderOptionsReducerAction, setOptions, setOtelEnabled, setOtelVersion } from 'hooks/useBuilderOptionsState';
import useIsNewQuery from 'hooks/useIsNewQuery';
import { useDefaultFilters, useDefaultTimeColumn, useLogDefaultsOnMount, useOtelColumns } from './logsQueryBuilderHooks';

interface LogsQueryBuilderProps {
  datasource: Datasource;
  builderOptions: QueryBuilderOptions;
  builderOptionsDispatch: React.Dispatch<BuilderOptionsReducerAction>;
}

interface LogsQueryBuilderState {
  otelEnabled: boolean;
  otelVersion: string;
  selectedColumns: SelectedColumn[];
  timeColumn?: SelectedColumn;
  logLevelColumn?: SelectedColumn;
  messageColumn?: SelectedColumn;
  // liveView: boolean;
  orderBy: OrderBy[];
  limit: number;
  filters: Filter[];
}

export const LogsQueryBuilder = (props: LogsQueryBuilderProps) => {
  const { datasource, builderOptions, builderOptionsDispatch } = props;
  const labels = allLabels.components.LogsQueryBuilder;
  const allColumns = useColumns(datasource, builderOptions.database, builderOptions.table);
  const isNewQuery = useIsNewQuery(builderOptions);
  const builderState: LogsQueryBuilderState = useMemo(() => ({
    otelEnabled: builderOptions.meta?.otelEnabled || false,
    otelVersion: builderOptions.meta?.otelVersion || '',
    timeColumn: getColumnByHint(builderOptions, ColumnHint.Time),
    logLevelColumn: getColumnByHint(builderOptions, ColumnHint.LogLevel),
    messageColumn: getColumnByHint(builderOptions, ColumnHint.LogMessage),
    selectedColumns: builderOptions.columns?.filter(c => (
      // Only select columns that don't have their own box
      c.hint !== ColumnHint.Time &&
      c.hint !== ColumnHint.LogLevel &&
      c.hint !== ColumnHint.LogMessage
    )) || [],
    // liveView: builderOptions.meta?.liveView || false,
    filters: builderOptions.filters || [],
    orderBy: builderOptions.orderBy || [],
    limit: builderOptions.limit || 0,
    }), [builderOptions]);
  const [showConfigWarning, setConfigWarningOpen] = useState(datasource.getDefaultLogsColumns().size === 0 && builderOptions.columns?.length === 0);

  const onOptionChange = useBuilderOptionChanges<LogsQueryBuilderState>(next => {
    const nextColumns = next.selectedColumns.slice();
    if (next.timeColumn) {
      nextColumns.push(next.timeColumn);
    }
    if (next.logLevelColumn) {
      nextColumns.push(next.logLevelColumn);
    }
    if (next.messageColumn) {
      nextColumns.push(next.messageColumn);
    }

    builderOptionsDispatch(setOptions({
      columns: nextColumns,
      filters: next.filters,
      orderBy: next.orderBy,
      limit: next.limit
    }));
  }, builderState);

  useLogDefaultsOnMount(datasource, isNewQuery, builderOptions, builderOptionsDispatch);
  useOtelColumns(builderState.otelEnabled, builderState.otelVersion, builderOptionsDispatch);
  useDefaultTimeColumn(datasource, allColumns, builderOptions.table, builderState.timeColumn, builderState.otelEnabled, builderOptionsDispatch);
  useDefaultFilters(builderOptions.table, builderState.timeColumn, builderState.filters, builderState.orderBy, builderOptionsDispatch);
  
  const configWarning = showConfigWarning && (
    <Alert title="" severity="warning" buttonContent="Close" onRemove={() => setConfigWarningOpen(false)}>
      <VerticalGroup>
        <div>
          {'To speed up your query building, enter your default logs configuration in your '}
          <a style={{ textDecoration: 'underline' }} href={`/connections/datasources/edit/${encodeURIComponent(datasource.uid)}`}>ClickHouse Data Source settings</a>
        </div>
      </VerticalGroup>
    </Alert>
  );

  return (
    <div>
      { configWarning }
      <OtelVersionSelect
        enabled={builderState.otelEnabled}
        onEnabledChange={e => builderOptionsDispatch(setOtelEnabled(e))}
        selectedVersion={builderState.otelVersion}
        onVersionChange={v => builderOptionsDispatch(setOtelVersion(v))}
      />
      <ColumnsEditor
        disabled={builderState.otelEnabled}
        allColumns={allColumns}
        selectedColumns={builderState.selectedColumns}
        onSelectedColumnsChange={onOptionChange('selectedColumns')}
      />
      <div className="gf-form">
        <ColumnSelect
          disabled={builderState.otelEnabled}
          allColumns={allColumns}
          selectedColumn={builderState.timeColumn}
          invalid={!builderState.timeColumn}
          onColumnChange={onOptionChange('timeColumn')}
          columnFilterFn={columnFilterDateTime}
          columnHint={ColumnHint.Time}
          label={labels.logTimeColumn.label}
          tooltip={labels.logTimeColumn.tooltip}
        />
        <ColumnSelect
          disabled={builderState.otelEnabled}
          allColumns={allColumns}
          selectedColumn={builderState.logLevelColumn}
          invalid={!builderState.logLevelColumn}
          onColumnChange={onOptionChange('logLevelColumn')}
          columnFilterFn={columnFilterString}
          columnHint={ColumnHint.LogLevel}
          label={labels.logLevelColumn.label}
          tooltip={labels.logLevelColumn.tooltip}
          inline
        />
      </div>
      <div className="gf-form">
        <ColumnSelect
          disabled={builderState.otelEnabled}
          allColumns={allColumns}
          selectedColumn={builderState.messageColumn}
          invalid={!builderState.messageColumn}
          onColumnChange={onOptionChange('messageColumn')}
          columnFilterFn={columnFilterString}
          columnHint={ColumnHint.LogMessage}
          label={labels.logMessageColumn.label}
          tooltip={labels.logMessageColumn.tooltip}
        />
        {/* <Switch
          value={builderState.liveView}
          onChange={onOptionChange('liveView')}
          label={labels.liveView.label}
          tooltip={labels.liveView.tooltip}
          inline
        /> */}
      </div>
      <OrderByEditor
        orderByOptions={getOrderByOptions(builderOptions, allColumns)}
        orderBy={builderState.orderBy}
        onOrderByChange={onOptionChange('orderBy')}
      />
      <LimitEditor limit={builderState.limit} onLimitChange={onOptionChange('limit')} />
      <FiltersEditor
        allColumns={allColumns}
        filters={builderState.filters}
        onFiltersChange={onOptionChange('filters')}
      />
    </div>
  );
}
