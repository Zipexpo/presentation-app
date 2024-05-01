"use client";

import { createList } from "@/lib/action";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import Link from "next/link";
import FormField from "../FormField/FormField";
import { listSchema } from "./listSchema";
import CriteriaField from "../CriteriaField/CriteriaField";

const ListForm = () => {
  const {
    register,
    formState: { errors, success, isDirty, isValid, isValidating },
    handleSubmit,
    control,
    setError,
  } = useForm({
    mode: "onChange",
    resolver: zodResolver(listSchema, undefined, { rawValues: true }),
  });

  const onSubmit =  (data) => {
    alert("Hey")
    console.log("SUCCESS", data);
    // createList(data);
  };
  const isSubmittable = !!isDirty && !!isValid;
  return (
    <form id="newlist" className="form" onSubmit={handleSubmit(onSubmit)}>
      <FormField
        type="text"
        placeholder="Title"
        name="title"
        title="Title"
        register={register}
        error={errors?.title}
        required={true}
      />
      <FormField
        title="Duration"
        type="number"
        placeholder="Duration each presentation"
        name="durationEach"
        register={register}
        error={errors?.durationEach}
        valueAsNumber 
        subfix="minutes"
      />
      <FormField
        type="date"
        placeholder="Present Date"
        name="presenDate"
        title="Present Date"
        register={register}
        required={true}
        error={errors?.presenDate}
      />
      <CriteriaField
        name="criteria"
        title="Criterias"
        register={register}
        control={control}
        error={errors?.criteria}
      />

      <div className="flex justify-between">
        <button form="newlist" type="submit" disabled={!isSubmittable} className="button button-primary">Save</button>
        <Link href="/list" className="button">
          Cancel
        </Link>
      </div>
      <div className="w-full flex">
          <div className="w-1/2 space-y-4">
            <h3>is valid:</h3>
            <code>{isValid + ""}</code>

            <h3>is dirty:</h3>
            <code>{isDirty + ""}</code>

            <h3>is validating:</h3>
            <code>{isValidating + ""}</code>
            <h3>error:</h3>
            <code>{JSON.stringify(errors?.message)}</code>
          </div>
        </div>
    </form>
  );
};

export default ListForm;
