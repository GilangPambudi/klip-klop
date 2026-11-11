"use client";

import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export interface Failure {
    title: string;
    message: string;
}

interface ErrorDialogProps {
    failure: Failure | null;
    onClose: () => void;
}

export function ErrorDialog({ failure, onClose }: ErrorDialogProps) {
    return (
        <AlertDialog open={!!failure} onOpenChange={(open) => !open && onClose()}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{failure?.title}</AlertDialogTitle>
                    <AlertDialogDescription className="wrap-anywhere">
                        {failure?.message}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>OK</AlertDialogCancel>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
