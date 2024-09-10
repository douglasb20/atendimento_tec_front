import { ReactNode } from 'react';
import {
  AppBreadcrumbProps,
  AppConfigProps,
  AppMenuItemProps,
  AppTopbarRef,
  Breadcrumb,
  BreadcrumbItem,
  ChatContextProps,
  ColorScheme,
  LayoutConfig,
  LayoutContextProps,
  LayoutState,
  MailContextProps,
  MenuContextProps,
  MenuModel,
  MenuProps,
  NodeRef,
  Page,
  TaskContextProps,
  UseSubmenuOverlayPositionProps,
} from './layout';

type ChildContainerProps = {
  children: ReactNode;
};

export type {
  Page,
  AppBreadcrumbProps,
  Breadcrumb,
  BreadcrumbItem,
  ColorScheme,
  MenuProps,
  MenuModel,
  LayoutConfig,
  LayoutState,
  Breadcrumb,
  LayoutContextProps,
  MailContextProps,
  MenuContextProps,
  ChatContextProps,
  TaskContextProps,
  AppConfigProps,
  NodeRef,
  AppTopbarRef,
  AppMenuItemProps,
  UseSubmenuOverlayPositionProps,
  ChildContainerProps,
  CustomEvent,
};
