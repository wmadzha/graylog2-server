import React from 'react';
import PropTypes from 'prop-types';

import { Col, Row } from 'components/graylog';
import { DocumentTitle, PageHeader, Spinner } from 'components/common';
import { PluginStore } from 'graylog-web-plugin/plugin';
import connect from 'stores/connect';
import CombinedProvider from 'injection/CombinedProvider';
import { isPermitted } from 'util/PermissionsMixin';

import SearchesConfig from 'components/configurations/SearchesConfig';
import MessageProcessorsConfig from 'components/configurations/MessageProcessorsConfig';
import SidecarConfig from 'components/configurations/SidecarConfig';
import CustomizationConfig from 'components/configurations/CustomizationConfig';
import EventsConfig from 'components/configurations/EventsConfig';
import UrlWhiteListConfig from 'components/configurations/UrlWhiteListConfig';
import DecoratorsConfig from '../components/configurations/DecoratorsConfig';
import {} from 'components/maps/configurations';

// eslint-disable-next-line import/no-webpack-loader-syntax
import style from '!style/useable!css!components/configurations/ConfigurationStyles.css';

const { CurrentUserStore } = CombinedProvider.get('CurrentUser');
const { ConfigurationsActions, ConfigurationsStore } = CombinedProvider.get('Configurations');

const CONFIG = {
  SEARCHES_CLUSTER: 'org.graylog2.indexer.searches.SearchesClusterConfig',
  MESSAGE_PROCESSORS: 'org.graylog2.messageprocessors.MessageProcessorsConfig',
  SIDECAR: 'org.graylog.plugins.sidecar.system.SidecarConfiguration',
  EVENTS: 'org.graylog.events.configuration.EventsConfiguration',
  URL_WHITELIST: 'org.graylog2.system.urlwhitelist.UrlWhitelist',
  CUSTOMIZATION: 'org.graylog2.configuration.Customization',
};

class ConfigurationsPage extends React.Component {
  state = {
    loaded: false,
  }

  checkLoadedTimer = undefined

  componentDidMount() {
    const { currentUser: { permissions } } = this.props;
    style.use();
    this._checkConfig();

    ConfigurationsActions.list(CONFIG.SEARCHES_CLUSTER);
    ConfigurationsActions.listMessageProcessorsConfig(CONFIG.MESSAGE_PROCESSORS);
    ConfigurationsActions.list(CONFIG.SIDECAR);
    ConfigurationsActions.list(CONFIG.EVENTS);
    ConfigurationsActions.list(CONFIG.CUSTOMIZATION);

    if (isPermitted(permissions, ['urlwhitelist:read'])) {
      ConfigurationsActions.listWhiteListConfig(CONFIG.URL_WHITELIST);
    }

    PluginStore.exports('systemConfigurations').forEach((systemConfig) => {
      ConfigurationsActions.list(systemConfig.configType);
    });
  }

  componentWillUnmount() {
    style.unuse();
    this._clearTimeout();
  }

  _getConfig = (configType, fallback = null) => {
    const { configuration } = this.props;
    if (configuration && configuration[configType]) {
      return configuration[configType];
    }
    return fallback;
  };

  _onUpdate = (configType) => {
    return (config) => {
      switch (configType) {
        case CONFIG.MESSAGE_PROCESSORS:
          return ConfigurationsActions.updateMessageProcessorsConfig(configType, config);
        case CONFIG.URL_WHITELIST:
          return ConfigurationsActions.updateWhitelist(configType, config);
        default:
          return ConfigurationsActions.update(configType, config);
      }
    };
  };

  _pluginConfigs = () => {
    return PluginStore.exports('systemConfigurations').map((systemConfig) => {
      return React.createElement(systemConfig.component, {
        // eslint-disable-next-line react/no-array-index-key
        key: `system-configuration-${systemConfig.configType}`,
        config: this._getConfig(systemConfig.configType) || undefined,
        updateConfig: this._onUpdate(systemConfig.configType),
      });
    });
  };

  _pluginConfigRows = () => {
    const pluginConfigs = this._pluginConfigs();
    const rows = [];
    let idx = 0;

    // Put two plugin config components per row.
    while (pluginConfigs.length > 0) {
      idx += 1;
      rows.push(
        <Row key={`plugin-config-row-${idx}`}>
          <Col md={6}>
            {pluginConfigs.shift()}
          </Col>
          <Col md={6}>
            {pluginConfigs.shift() || (<span>&nbsp;</span>)}
          </Col>
        </Row>,
      );
    }

    return rows;
  };

  _checkConfig = () => {
    const { configuration } = this.props;

    this.checkLoadedTimer = setTimeout(() => {
      if (Object.keys(configuration).length >= Object.keys(CONFIG).length) {
        this.setState({ loaded: true }, this._clearTimeout);
        return;
      }

      this._checkConfig();
    }, 100);
  };

  _clearTimeout = () => {
    if (this.checkLoadedTimer) {
      clearTimeout(this.checkLoadedTimer);
    }
  }

  render() {
    const { loaded } = this.state;
    const { currentUser: { permissions } } = this.props;
    let pluginConfigRows = [];
    let Output = (
      <Col md={12}>
        <Spinner text="Loading Configuration Panel..." />
      </Col>
    );

    if (loaded) {
      pluginConfigRows = this._pluginConfigRows();
      const searchesConfig = this._getConfig(CONFIG.SEARCHES_CLUSTER);
      const messageProcessorsConfig = this._getConfig(CONFIG.MESSAGE_PROCESSORS);
      const sidecarConfig = this._getConfig(CONFIG.SIDECAR);
      const eventsConfig = this._getConfig(CONFIG.EVENTS);
      const urlWhiteListConfig = this._getConfig(CONFIG.URL_WHITELIST);
      const customizationConfig = this._getConfig(CONFIG.CUSTOMIZATION, {});

      Output = (
        <>
          <Col md={6}>
            <SearchesConfig config={searchesConfig}
                            updateConfig={this._onUpdate(CONFIG.SEARCHES_CLUSTER)} />
          </Col>
          <Col md={6}>
            <MessageProcessorsConfig config={messageProcessorsConfig}
                                     updateConfig={this._onUpdate(CONFIG.MESSAGE_PROCESSORS)} />
          </Col>
          <Col md={6}>
            <SidecarConfig config={sidecarConfig}
                           updateConfig={this._onUpdate(CONFIG.SIDECAR)} />
          </Col>
          <Col md={6}>
            <CustomizationConfig config={customizationConfig}
                                 updateConfig={this._onUpdate(CONFIG.CUSTOMIZATION)} />
          </Col>
          <Col md={6}>
            <EventsConfig config={eventsConfig}
                          updateConfig={this._onUpdate(CONFIG.EVENTS)} />
          </Col>
          {isPermitted(permissions, ['urlwhitelist:read']) && (
          <Col md={6}>
            <UrlWhiteListConfig config={urlWhiteListConfig}
                                updateConfig={this._onUpdate(CONFIG.URL_WHITELIST)} />
          </Col>
          )}
          <Col md={6}>
            <DecoratorsConfig />
          </Col>
        </>
      );
    }

    return (
      <DocumentTitle title="Configurations">
        <span>
          <PageHeader title="Configurations">
            <span>
              You can configure system settings for different sub systems on this page.
            </span>
          </PageHeader>

          <Row className="content">
            {Output}
          </Row>

          {pluginConfigRows.length > 0 && (
          <Row className="content">
            <Col md={12}>
              <h2>Plugins</h2>
              <p className="description">Configuration for installed plugins.</p>
              <hr className="separator" />
              <div className="top-margin">
                {pluginConfigRows}
              </div>
            </Col>
          </Row>
          )}
        </span>
      </DocumentTitle>
    );
  }
}

ConfigurationsPage.propTypes = {
  configuration: PropTypes.object.isRequired,
  currentUser: PropTypes.object.isRequired,
};

export default connect(ConfigurationsPage, { configurations: ConfigurationsStore, currentUser: CurrentUserStore }, ({ configurations, currentUser, ...otherProps }) => ({
  ...configurations,
  ...currentUser,
  ...otherProps,
}));
