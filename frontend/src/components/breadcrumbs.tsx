import React, { Fragment } from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Link } from 'react-router-dom';

export interface BreadcrumbItemType {
  title: React.ReactNode;
  href?: string;
}

export function Breadcrumbs({ breadcrumbs = [] }: { breadcrumbs?: BreadcrumbItemType[] }) {
  if (!breadcrumbs.length) return null;

  return (
    <Breadcrumb>
      <BreadcrumbList className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 gap-1.5 sm:gap-2">
        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1;
          return (
            <Fragment key={index}>
              <BreadcrumbItem>
                {isLast || !item.href ? (
                  <BreadcrumbPage className="font-semibold text-neutral-900 dark:text-neutral-100">{item.title}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors">
                    <Link to={item.href}>{item.title}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator className="text-neutral-400" />}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export default Breadcrumbs;

