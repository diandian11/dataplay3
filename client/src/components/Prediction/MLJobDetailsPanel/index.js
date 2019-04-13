import React, { PureComponent } from 'react';
import { Row, Col, Form, Card, Statistic, Collapse, Icon } from 'antd';

import { chartConfigs } from '@/components/Visualization/ChartConfig';
import GGChart from '@/components/Visualization/GGChart';

import styles from './index.less';

const { Panel } = Collapse;
const { Countdown } = Statistic;
const refreshInterval = 10;

class MLJobDetailsPanel extends PureComponent {
  timer = null;

  componentDidMount() {
    const { job, onRefresh } = this.props;
    if (onRefresh) {
      this.timer = setInterval(function() {
        onRefresh(job.id);
      }, 1000 * refreshInterval);
    }
  }

  componentWillUnmount() {
    clearInterval(this.timer);
  }

  render() {
    const { job, dispatch } = this.props;

    const {
      validation_result,
      status,
      start_time,
      end_time,
      model_representation,
      model_stats,
      job_option,
      validation_option,
      ...jobDetails
    } = job;

    const jobType = jobDetails.type;

    const { time_left_for_this_task } = job_option;
    const deadline = 1000 * time_left_for_this_task + 1000 * start_time + 1000 * refreshInterval;

    const formItemLayout = {
      labelCol: {
        xs: { span: 24 },
        sm: { span: 8 },
      },
      wrapperCol: {
        xs: { span: 24 },
        sm: { span: 16 },
      },
    };

    // const details = JSON.stringify(job);
    if (status == 'SUCCESS' || status == 'FAILED') {
      clearInterval(this.timer);
    }

    const buildETA = () => {
      if (status != 'SUCCESS' && status != 'FAILED' && jobType != 'TimeSerialsForecastsJob') {
        return (
          <Col span={8}>
            <Countdown title="ETA" value={deadline} format="HH:mm:ss:SSS" />
          </Col>
        );
      }

      return <Col span={8} />;
    };

    const buildStatusIcon = () => {
      if (status == 'SUCCESS') {
        return <Icon type="check" />;
      }
      if (status == 'FAILED') {
        return <Icon type="warning" />;
      }
      return <Icon type="loading" />;
    };

    const buildItems = obj => {
      const items = [];
      for (const p in obj) {
        if (obj[p] instanceof Object && !Array.isArray(obj[p])) {
          const childItems = buildItems(obj[p]);
          childItems.map(item => {
            items.push(item);
          });
        } else {
          items.push(
            <Form.Item label={p} key={p} className={styles.detailsItem}>
              <span className="ant-form-text">{String(obj[p])}</span>
            </Form.Item>
          );
        }
      }
      return items;
    };

    const buildValidationStats = obj => {
      const items = [];
      for (const p in obj) {
        if (typeof obj[p] == 'number') {
          items.push(
            <Col span={8} key={p}>
              <Statistic title={p} value={obj[p]} />
            </Col>
          );
        }
      }
      return items;
    };

    const buildConfusionMatrix = obj => {
      const { confusion_matrix } = obj;
      if (!confusion_matrix) {
        return null;
      }
      const data = [];
      confusion_matrix.lables.forEach(function(actual, actualIndex) {
        confusion_matrix.lables.reverse().forEach(function(predicted, predictedIndex) {
          const item = {};
          item.actual = actual;
          item.predicted = predicted;
          const index = confusion_matrix.lables.length - predictedIndex - 1;
          item.value = confusion_matrix.value[actualIndex][index];
          data.push(item);
        });
      });
      console.log(data);
      const config = chartConfigs.find('heatmap');
      const feeds = {};
      feeds.x = 'actual';
      feeds.y = 'predicted';
      feeds.color = 'value';
      const grammar = config[0].build(feeds);
      console.log(grammar);
      return <GGChart grammar={grammar} data={data} />;
    };

    const jobContents = buildItems(jobDetails);
    const optionContents = buildItems(job_option);
    const validationContents = buildItems(validation_option);
    const confusionMatrix = buildConfusionMatrix(validation_result);

    return (
      <div className={styles.details}>
        <Row>
          <Col key="JobDetails" span={12}>
            <Collapse defaultActiveKey={['1']} className={styles.detailsPanel}>
              <Panel header="Job Info" key="1">
                <Form {...formItemLayout}>{jobContents}</Form>
              </Panel>
              {jobType != 'TimeSerialsForecastsJob' && (
                <Panel header="Validation Options" key="2">
                  <Form {...formItemLayout}>{validationContents}</Form>
                </Panel>
              )}
              <Panel header="Job Options" key="3">
                <Form {...formItemLayout}>{optionContents}</Form>
              </Panel>
            </Collapse>
          </Col>
          <Col key="JobStats" span={12}>
            <Collapse defaultActiveKey={['1']} className={styles.detailsPanel}>
              <Panel header="Status" key="1">
                <Row gutter={16}>
                  <Col span={8}>
                    <Statistic title="Status" value={status} prefix={buildStatusIcon()} />
                  </Col>
                  {buildETA()}
                </Row>
                <Row gutter={16}>
                  {validation_result && buildValidationStats(validation_result)}
                </Row>
                <Row gutter={16}>{confusionMatrix && confusionMatrix}</Row>
              </Panel>
            </Collapse>
          </Col>
        </Row>
      </div>
    );
  }
}

export default MLJobDetailsPanel;
