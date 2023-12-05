import React, { useMemo, useState } from 'react';
import { ColumnsEditor } from '../ColumnsEditor';
import { AggregateColumn, BuilderMode, Filter, OrderBy, QueryBuilderOptions, SelectedColumn } from 'types/queryBuilder';
import { OrderByEditor, getOrderByOptions } from '../OrderByEditor';
import { LimitEditor } from '../LimitEditor';
import { FiltersEditor } from '../FilterEditor';
import allLabels from 'labels';
import { ModeSwitch } from '../ModeSwitch';
import { AggregateEditor } from '../AggregateEditor';
import { GroupByEditor } from '../GroupByEditor';
import { Datasource } from 'data/CHDatasource';
import { useBuilderOptionChanges } from 'hooks/useBuilderOptionChanges';
import useColumns from 'hooks/useColumns';
import { BuilderOptionsReducerAction, setOptions } from 'hooks/useBuilderOptionsState';

interface TableQueryBuilderProps {
  datasource: Datasource;
  builderOptions: QueryBuilderOptions;
  builderOptionsDispatch: React.Dispatch<BuilderOptionsReducerAction>;
}

interface TableQueryBuilderState {
  selectedColumns: SelectedColumn[];
  aggregates: AggregateColumn[];
  groupBy: string[];
  orderBy: OrderBy[];
  limit: number;
  filters: Filter[];
}

export const TableQueryBuilder = (props: TableQueryBuilderProps) => {
  const { datasource, builderOptions, builderOptionsDispatch } = props;
  const allColumns = useColumns(datasource, builderOptions.database, builderOptions.table);
  const labels = allLabels.components.TableQueryBuilder;
  const [isAggregateMode, setAggregateMode] = useState<boolean>((builderOptions.aggregates?.length || 0) > 0); // Toggle Simple vs Aggregate mode
  const builderState: TableQueryBuilderState = useMemo(() => ({
    selectedColumns: builderOptions.columns || [],
    aggregates: builderOptions.aggregates || [],
    groupBy: builderOptions.groupBy || [],
    orderBy: builderOptions.orderBy || [],
    limit: builderOptions.limit || 0,
    filters: builderOptions.filters || [],
  }), [builderOptions]);

  const onOptionChange = useBuilderOptionChanges<TableQueryBuilderState>(next => {
    builderOptionsDispatch(setOptions({
      mode: isAggregateMode ? BuilderMode.Aggregate : BuilderMode.List,
      columns: next.selectedColumns,
      aggregates: isAggregateMode ? next.aggregates : [],
      groupBy: isAggregateMode ? next.groupBy : [],
      filters: next.filters,
      orderBy: next.orderBy,
      limit: next.limit
    }));
  }, builderState);

  return (
    <div>
      <ModeSwitch
        labelA={labels.simpleQueryModeLabel}
        labelB={labels.aggregateQueryModeLabel}
        value={isAggregateMode}
        onChange={setAggregateMode}
        label={labels.builderModeLabel}
        tooltip={labels.builderModeTooltip}
      />

      <ColumnsEditor
        allColumns={allColumns}
        selectedColumns={builderState.selectedColumns}
        onSelectedColumnsChange={onOptionChange('selectedColumns')}
        showAllOption
      />

      {isAggregateMode && (
        <>
          <AggregateEditor allColumns={allColumns} aggregates={builderState.aggregates} onAggregatesChange={onOptionChange('aggregates')} />
          <GroupByEditor groupBy={builderState.groupBy} onGroupByChange={onOptionChange('groupBy')} allColumns={allColumns} />
        </>
      )}

      <OrderByEditor
        orderByOptions={getOrderByOptions(builderOptions, allColumns)}
        orderBy={builderState.orderBy}
        onOrderByChange={onOptionChange('orderBy')}
      />
      <LimitEditor limit={builderState.limit} onLimitChange={onOptionChange('limit')} />
      <FiltersEditor filters={builderState.filters} onFiltersChange={onOptionChange('filters')} allColumns={allColumns} />
    </div>
  );
}
