#include <stdio.h>
#include <stdlib.h>

void safe_example() {
    int *ptr = malloc(sizeof(int));
    if (ptr != NULL) {
        *ptr = 42;  // Safe dereference
        printf("%d\n", *ptr);
        free(ptr);
        ptr = NULL;  // Prevent use-after-free
    }

    char str[] = "Hello";  // Writable array
    str[0] = 'h';          // Safe modification
}

void unsafe_example() {
    int *ptr = NULL;
    *ptr = 42;

    char *str = "Hello";
    str[0] = 'h';

    int* getDanglingPointer() {
        int local = 5;
        return &local;
    }
}
