import React, {
  ComponentPropsWithoutRef,
  ForwardedRef,
  forwardRef,
} from "react";
import {
  Button as RACButton,
  Link as RACLink,
  type ButtonProps as RACButtonProps,
} from "react-aria-components";

export type AnchorOrButtonSharedProps = {
  children?: React.ReactNode;
  href?: string;
};

export type AnchorOrButtonProps = (
  | RACButtonProps
  | ComponentPropsWithoutRef<typeof RACLink>
) &
  AnchorOrButtonSharedProps;

function isAnchorProps(
  props: AnchorOrButtonProps,
): props is AnchorOrButtonSharedProps &
  ComponentPropsWithoutRef<typeof RACLink> {
  return typeof props.href === "string";
}

export const AnchorOrButton = forwardRef(function AnchorOrButton(
  props: AnchorOrButtonProps,
  ref: ForwardedRef<HTMLElement>,
) {
  return isAnchorProps(props) ? (
    <RACLink
      {...props}
      className={props.className}
      ref={ref as React.ForwardedRef<HTMLAnchorElement>}
    >
      {props.children}
    </RACLink>
  ) : (
    <RACButton
      {...props}
      className={props.className}
      ref={ref as React.ForwardedRef<HTMLButtonElement>}
    >
      {props.children}
    </RACButton>
  );
});
